// tests/admin-approve.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const { stripeMocks } = vi.hoisted(() => ({
  stripeMocks: {
    customersCreate: vi.fn(),
    customersRetrieve: vi.fn(),
    subscriptionsCreate: vi.fn(),
  },
}));

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { findUnique: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    siteConfig: { findUnique: vi.fn() },
  },
}));
vi.mock('../netlify/functions/lib/auth', () => ({ requireSuperAdmin: vi.fn() }));
vi.mock('../netlify/functions/lib/email', () => ({ sendApprovalEmail: vi.fn() }));
vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: () => ({
    customers: { create: stripeMocks.customersCreate, retrieve: stripeMocks.customersRetrieve },
    subscriptions: { create: stripeMocks.subscriptionsCreate },
  }),
}));

import { handler } from '../netlify/functions/admin-approve';
import prisma from '../netlify/functions/lib/prisma';
import { requireSuperAdmin } from '../netlify/functions/lib/auth';

const superAdminMock = vi.mocked(requireSuperAdmin);
const businessFindMock = vi.mocked(prisma.businessProfile.findUnique);
const businessUpdateMock = vi.mocked(prisma.businessProfile.update);
const businessUpdateManyMock = vi.mocked(prisma.businessProfile.updateMany);
const siteConfigFindMock = vi.mocked(prisma.siteConfig.findUnique);

const postEvent = (businessId = 'biz-1') => ({
  httpMethod: 'POST',
  headers: { authorization: 'Bearer admin' },
  body: JSON.stringify({ businessId }),
}) as unknown as HandlerEvent;

const pendingBusiness = {
  id: 'biz-1',
  name: 'Mi Negocio',
  ownerId: 'user-1',
  ownerFullName: 'Owner Name',
  status: 'pending',
  stripeCustomerId: 'cus_existing',
  subscriptionId: null,
  subscriptionStatus: null,
  trialEndsAt: null,
  owner: { id: 'user-1', name: 'Owner', email: 'owner@example.test' },
};

describe('admin-approve existing checkout subscription', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    superAdminMock.mockResolvedValue({ ok: true } as never);
    siteConfigFindMock.mockResolvedValue({ id: 'singleton', betaMode: false } as never);
    businessUpdateManyMock.mockResolvedValue({ count: 1 } as never);
    stripeMocks.customersRetrieve.mockResolvedValue({
      id: 'cus_existing',
      deleted: false,
      invoice_settings: { default_payment_method: 'pm_saved' },
    } as never);
    businessUpdateMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Mi Negocio',
      status: 'approved',
      approvedAt: new Date('2026-10-01T00:00:00Z'),
      subscriptionStatus: 'trial',
      stripeCustomerId: 'cus_existing',
      subscriptionId: 'sub_existing',
      trialEndsAt: new Date('2026-10-31T00:00:00Z'),
    } as never);
  });

  it('does not create a second Stripe subscription when checkout already created one', async () => {
    businessFindMock.mockResolvedValue({
      ...pendingBusiness,
      subscriptionId: 'sub_existing',
      trialEndsAt: new Date('2026-10-31T00:00:00Z'),
    } as never);

    const res = await handler(postEvent());

    expect(res.statusCode).toBe(200);
    expect(stripeMocks.subscriptionsCreate).not.toHaveBeenCalled();
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    expect(businessUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'approved',
        subscriptionStatus: 'trial',
        subscriptionId: 'sub_existing',
      }),
    }));
  });

  it('claims a pending null subscriptionStatus business before creating one approval subscription', async () => {
    businessFindMock.mockResolvedValue(pendingBusiness as never);
    stripeMocks.subscriptionsCreate.mockResolvedValue({
      id: 'sub_new',
      status: 'trialing',
      trial_end: 1790812800,
    } as never);
    businessUpdateMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Mi Negocio',
      status: 'approved',
      approvedAt: new Date('2026-10-01T00:00:00Z'),
      subscriptionStatus: 'trial',
      stripeCustomerId: 'cus_existing',
      subscriptionId: 'sub_new',
      trialEndsAt: new Date(1790812800 * 1000),
    } as never);

    const res = await handler(postEvent());

    expect(res.statusCode).toBe(200);
    expect(businessUpdateManyMock).toHaveBeenCalledWith({
      where: {
        id: 'biz-1',
        status: 'pending',
        subscriptionId: null,
        OR: [
          { subscriptionStatus: null },
          { subscriptionStatus: { not: 'approval_processing' } },
        ],
      },
      data: { subscriptionStatus: 'approval_processing' },
    });
    expect(stripeMocks.customersRetrieve).toHaveBeenCalledWith('cus_existing');
    expect(stripeMocks.subscriptionsCreate).toHaveBeenCalledWith(expect.objectContaining({
      customer: 'cus_existing',
      default_payment_method: 'pm_saved',
      items: [{ price: 'price_59_brl_monthly' }],
      trial_period_days: 30,
      metadata: { businessId: 'biz-1' },
    }), { idempotencyKey: 'business-approval-biz-1' });
    expect(businessUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'approved',
        subscriptionStatus: 'trial',
        subscriptionId: 'sub_new',
        trialEndsAt: new Date(1790812800 * 1000),
      }),
    }));
  });

  it('keeps the business pending when setup checkout has not saved a default payment method', async () => {
    businessFindMock.mockResolvedValue(pendingBusiness as never);
    stripeMocks.customersRetrieve.mockResolvedValue({
      id: 'cus_existing',
      deleted: false,
      invoice_settings: { default_payment_method: null },
    } as never);

    const res = await handler(postEvent());

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('SETUP_PAYMENT_METHOD_REQUIRED');
    expect(stripeMocks.customersCreate).not.toHaveBeenCalled();
    expect(stripeMocks.subscriptionsCreate).not.toHaveBeenCalled();
    expect(businessUpdateMock).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'approved' }),
    }));
    expect(businessUpdateManyMock).toHaveBeenLastCalledWith({
      where: { id: 'biz-1', subscriptionStatus: 'approval_processing', status: 'pending' },
      data: { subscriptionStatus: null },
    });
  });

  it('does not create a subscription when another approval request already claimed the pending business', async () => {
    businessFindMock.mockResolvedValue(pendingBusiness as never);
    businessUpdateManyMock.mockResolvedValue({ count: 0 } as never);

    const res = await handler(postEvent());

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('APPROVAL_ALREADY_IN_PROGRESS');
    expect(stripeMocks.customersRetrieve).not.toHaveBeenCalled();
    expect(stripeMocks.subscriptionsCreate).not.toHaveBeenCalled();
    expect(businessUpdateMock).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'approved' }),
    }));
  });

  it('preserves pending state when Stripe cannot create the approval subscription', async () => {
    businessFindMock.mockResolvedValue(pendingBusiness as never);
    stripeMocks.subscriptionsCreate.mockRejectedValue(new Error('card setup missing'));

    const res = await handler(postEvent());

    expect(res.statusCode).toBe(502);
    expect(JSON.parse(res.body).code).toBe('SUBSCRIPTION_CREATE_FAILED');
    expect(businessUpdateMock).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'approved' }),
    }));
    expect(businessUpdateManyMock).toHaveBeenLastCalledWith({
      where: { id: 'biz-1', subscriptionStatus: 'approval_processing', status: 'pending' },
      data: { subscriptionStatus: null },
    });
  });
});