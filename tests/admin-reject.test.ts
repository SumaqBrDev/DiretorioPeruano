// tests/admin-reject.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const { stripeMocks } = vi.hoisted(() => ({
  stripeMocks: { subscriptionsCancel: vi.fn() },
}));

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: { businessProfile: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock('../netlify/functions/lib/auth', () => ({ requireSuperAdmin: vi.fn() }));
vi.mock('../netlify/functions/lib/email', () => ({ sendRejectionEmail: vi.fn() }));
vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: () => ({ subscriptions: { cancel: stripeMocks.subscriptionsCancel } }),
}));

import { handler } from '../netlify/functions/admin-reject';
import prisma from '../netlify/functions/lib/prisma';
import { requireSuperAdmin } from '../netlify/functions/lib/auth';

const superAdminMock = vi.mocked(requireSuperAdmin);
const businessFindMock = vi.mocked(prisma.businessProfile.findUnique);
const businessUpdateMock = vi.mocked(prisma.businessProfile.update);

const postEvent = (body: Record<string, unknown>) => ({
  httpMethod: 'POST',
  headers: { authorization: 'Bearer admin' },
  body: JSON.stringify(body),
}) as unknown as HandlerEvent;

describe('admin-reject subscription safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    superAdminMock.mockResolvedValue({ ok: true } as never);
    businessUpdateMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Mi Negocio',
      status: 'rejected',
      rejectionReason: 'Incomplete documents',
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    } as never);
    stripeMocks.subscriptionsCancel.mockResolvedValue({ id: 'sub_trial', status: 'canceled' });
  });

  it('cancels a trial subscription before marking the business rejected', async () => {
    businessFindMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Mi Negocio',
      ownerFullName: 'Owner Name',
      status: 'pending',
      subscriptionId: 'sub_trial',
      subscriptionStatus: 'trial',
      owner: { id: 'user-1', name: 'Owner', email: 'owner@example.test' },
    } as never);

    const res = await handler(postEvent({ businessId: 'biz-1', reason: 'Incomplete documents' }));

    expect(res.statusCode).toBe(200);
    expect(stripeMocks.subscriptionsCancel).toHaveBeenCalledWith('sub_trial');
    expect(businessUpdateMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'biz-1' },
      data: expect.objectContaining({
        status: 'rejected',
        subscriptionStatus: 'canceled',
        subscriptionId: null,
      }),
    }));
  });

  it('does not mark the business rejected when Stripe cancellation fails', async () => {
    businessFindMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Mi Negocio',
      ownerFullName: 'Owner Name',
      status: 'pending',
      subscriptionId: 'sub_trial',
      subscriptionStatus: 'trial',
      owner: { id: 'user-1', name: 'Owner', email: 'owner@example.test' },
    } as never);
    stripeMocks.subscriptionsCancel.mockRejectedValue(new Error('Stripe unavailable'));

    const res = await handler(postEvent({ businessId: 'biz-1', reason: 'Incomplete documents' }));

    expect(res.statusCode).toBe(502);
    expect(businessUpdateMock).not.toHaveBeenCalled();
  });
});
