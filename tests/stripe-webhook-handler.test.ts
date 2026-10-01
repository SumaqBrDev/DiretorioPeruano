import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';

const { stripeMocks } = vi.hoisted(() => ({
  stripeMocks: {
    constructEvent: vi.fn(),
  },
}));

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    webhookEvent: { findUnique: vi.fn(), create: vi.fn() },
    businessProfile: { findFirst: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    user: { update: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: () => ({ webhooks: { constructEvent: stripeMocks.constructEvent } }),
}));

vi.mock('../netlify/functions/lib/email', () => ({
  sendPaymentFailedEmail: vi.fn(),
  sendTrialEndingEmail: vi.fn(),
}));

import { handler } from '../netlify/functions/stripe-webhook';
import prisma from '../netlify/functions/lib/prisma';

const webhookFindMock = vi.mocked(prisma.webhookEvent.findUnique);
const webhookCreateMock = vi.mocked(prisma.webhookEvent.create);
const businessFindUniqueMock = vi.mocked(prisma.businessProfile.findUnique);
const businessUpdateMock = vi.mocked(prisma.businessProfile.update);
const userUpdateMock = vi.mocked(prisma.user.update);

const postWebhook = async () => handler({
  httpMethod: 'POST',
  headers: { 'stripe-signature': 'sig_test' },
  body: '{"id":"evt_created"}',
} as unknown as HandlerEvent);

describe('stripe-webhook handler subscription events', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    webhookFindMock.mockResolvedValue(null as never);
    webhookCreateMock.mockResolvedValue({ id: 'wh_1' } as never);
  });

  it('handles customer.subscription.created by syncing trial status and promoting the approved owner', async () => {
    stripeMocks.constructEvent.mockReturnValue({
      id: 'evt_created',
      type: 'customer.subscription.created',
      data: {
        object: {
          id: 'sub_new',
          status: 'trialing',
          metadata: { businessId: 'biz-1' },
          trial_end: 1790812800,
          customer: 'cus_1',
        },
      },
    });
    businessFindUniqueMock
      .mockResolvedValueOnce({ id: 'biz-1', status: 'approved', subscriptionId: null } as never)
      .mockResolvedValueOnce({ ownerId: 'user-1', status: 'approved', owner: { id: 'user-1', role: 'consumer' } } as never);
    businessUpdateMock.mockResolvedValue({ id: 'biz-1' } as never);

    const res = await postWebhook();

    expect(res.statusCode).toBe(200);
    expect(businessUpdateMock).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: {
        subscriptionStatus: 'trial',
        subscriptionId: 'sub_new',
        trialEndsAt: new Date(1790812800 * 1000),
      },
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'business', businessIntentAt: null },
    });
    expect(webhookCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ stripeEventId: 'evt_created', type: 'customer.subscription.created' }),
    }));
  });

  it('defers customer.subscription.created for a pending business without marking the event processed', async () => {
    stripeMocks.constructEvent.mockReturnValue({
      id: 'evt_pending',
      type: 'customer.subscription.created',
      data: { object: { id: 'sub_new', status: 'trialing', metadata: { businessId: 'biz-1' }, customer: 'cus_1' } },
    });
    businessFindUniqueMock.mockResolvedValue({ id: 'biz-1', status: 'pending', subscriptionId: null } as never);

    const res = await postWebhook();

    expect(res.statusCode).toBe(503);
    expect(JSON.parse(res.body).code).toBe('BUSINESS_APPROVAL_NOT_COMMITTED');
    expect(businessUpdateMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(webhookCreateMock).not.toHaveBeenCalled();
  });

  it('acknowledges terminal rejected subscription events without promotion', async () => {
    stripeMocks.constructEvent.mockReturnValue({
      id: 'evt_rejected',
      type: 'customer.subscription.updated',
      data: { object: { id: 'sub_new', status: 'active', metadata: { businessId: 'biz-1' }, customer: 'cus_1' } },
    });
    businessFindUniqueMock.mockResolvedValue({ id: 'biz-1', status: 'rejected', subscriptionId: null } as never);

    const res = await postWebhook();

    expect(res.statusCode).toBe(200);
    expect(businessUpdateMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
    expect(webhookCreateMock).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ stripeEventId: 'evt_rejected', type: 'customer.subscription.updated' }),
    }));
  });
});