// tests/webhook.test.ts
// Task 2.4 — Webhook idempotency + disabledAt + subscriptionId.
// Pure logic tests: mock prisma to avoid DATABASE_URL.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    webhookEvent: { findUnique: vi.fn(), create: vi.fn() },
    businessProfile: { findFirst: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
    user: { update: vi.fn() },
  },
}));

const { stripeMocks } = vi.hoisted(() => ({
  stripeMocks: {
    constructEvent: vi.fn(),
    setupIntentsRetrieve: vi.fn(),
    customersUpdate: vi.fn(),
  },
}));

vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: () => ({
    webhooks: { constructEvent: stripeMocks.constructEvent },
    setupIntents: { retrieve: stripeMocks.setupIntentsRetrieve },
    customers: { update: stripeMocks.customersUpdate },
  }),
}));

vi.mock('../netlify/functions/lib/email', () => ({
  sendPaymentFailedEmail: vi.fn(),
  sendTrialEndingEmail: vi.fn(),
}));

import { checkIdempotency, markEventProcessed } from '../netlify/functions/lib/webhook-events';
import { syncSubscriptionStatus, handleSetupCheckoutCompleted, handleSubscriptionDeleted } from '../netlify/functions/stripe-webhook';
import prisma from '../netlify/functions/lib/prisma';

const webhookFindMock = vi.mocked(prisma.webhookEvent.findUnique);
const webhookCreateMock = vi.mocked(prisma.webhookEvent.create);
const businessFindFirstMock = vi.mocked(prisma.businessProfile.findFirst);
const businessFindUniqueMock = vi.mocked(prisma.businessProfile.findUnique);
const businessUpdateMock = vi.mocked(prisma.businessProfile.update);
const userUpdateMock = vi.mocked(prisma.user.update);

describe('checkIdempotency (pure logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the event has NOT been processed (no DB record)', async () => {
    webhookFindMock.mockResolvedValue(null);
    const result = await checkIdempotency('evt_123');
    expect(result).toBeNull();
    expect(webhookFindMock).toHaveBeenCalledWith({
      where: { stripeEventId: 'evt_123' },
    });
  });

  it('returns the existing WebhookEvent when the event HAS been processed', async () => {
    const existing = { id: 'wh_1', stripeEventId: 'evt_123', type: 'customer.subscription.deleted', processedAt: new Date() };
    webhookFindMock.mockResolvedValue(existing as any);
    const result = await checkIdempotency('evt_123');
    expect(result).not.toBeNull();
    expect(result?.stripeEventId).toBe('evt_123');
  });
});

describe('markEventProcessed (pure logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a WebhookEvent record with the given stripeEventId, type, and payload', async () => {
    const payload = { id: 'sub_1' };
    webhookCreateMock.mockResolvedValue({
      id: 'wh_new',
      stripeEventId: 'evt_456',
      type: 'customer.subscription.updated',
      payload,
      processedAt: new Date(),
    } as any);

    const result = await markEventProcessed('evt_456', 'customer.subscription.updated', payload);
    expect(result).not.toBeNull();
    expect(webhookCreateMock).toHaveBeenCalledWith({
      data: {
        stripeEventId: 'evt_456',
        type: 'customer.subscription.updated',
        payload,
        processedAt: expect.any(Date),
      },
    });
  });
});

describe('syncSubscriptionStatus owner promotion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('promotes the owner to role=business when a subscription becomes trialing', async () => {
    businessUpdateMock.mockResolvedValue({ id: 'biz-1' } as never);
    businessFindUniqueMock
      .mockResolvedValueOnce({ id: 'biz-1', status: 'approved', subscriptionId: null } as never)
      .mockResolvedValueOnce({
        ownerId: 'user-1',
        status: 'approved',
        owner: { id: 'user-1', role: 'consumer' },
      } as never);

    await syncSubscriptionStatus({
      id: 'sub_1',
      status: 'trialing',
      metadata: { businessId: 'biz-1' },
      trial_end: 1790812800,
      customer: 'cus_1',
    } as any);

    expect(businessUpdateMock).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: {
        subscriptionStatus: 'trial',
        subscriptionId: 'sub_1',
        trialEndsAt: new Date(1790812800 * 1000),
      },
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      data: { role: 'business', businessIntentAt: null },
    });
  });

  it('does NOT promote when the business has no owner', async () => {
    businessUpdateMock.mockResolvedValue({ id: 'biz-1' } as never);
    businessFindUniqueMock
      .mockResolvedValueOnce({ id: 'biz-1', status: 'approved', subscriptionId: null } as never)
      .mockResolvedValueOnce({ ownerId: null, status: 'approved', owner: null } as never);

    await syncSubscriptionStatus({
      id: 'sub_2',
      status: 'active',
      metadata: { businessId: 'biz-1' },
      trial_end: null,
      customer: 'cus_1',
    } as any);

    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it('promotes by customer fallback when subscription metadata has no businessId', async () => {
    businessFindFirstMock.mockResolvedValue({ id: 'biz-fallback', status: 'approved', subscriptionId: null } as never);
    businessUpdateMock.mockResolvedValue({ id: 'biz-fallback' } as never);
    businessFindUniqueMock.mockResolvedValue({
      ownerId: 'user-fallback',
      status: 'approved',
      owner: { id: 'user-fallback', role: 'consumer' },
    } as never);

    await syncSubscriptionStatus({
      id: 'sub_3',
      status: 'active',
      metadata: {},
      trial_end: null,
      customer: 'cus_fallback',
    } as any);

    expect(businessFindFirstMock).toHaveBeenCalledWith({
      where: { stripeCustomerId: 'cus_fallback' },
    });
    expect(userUpdateMock).toHaveBeenCalledWith({
      where: { id: 'user-fallback' },
      data: { role: 'business', businessIntentAt: null },
    });
  });
});

describe('subscription webhook lifecycle guards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not update or promote rejected businesses from stale active subscription events', async () => {
    businessFindUniqueMock.mockResolvedValue({
      id: 'biz-1',
      status: 'rejected',
      subscriptionId: null,
      owner: { id: 'user-1', role: 'consumer' },
    } as never);

    await syncSubscriptionStatus({
      id: 'sub_stale',
      status: 'active',
      metadata: { businessId: 'biz-1' },
      trial_end: null,
      customer: 'cus_1',
    } as any);

    expect(businessUpdateMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
  });

  it('does not overwrite rejected status when a subscription is deleted later', async () => {
    businessFindFirstMock.mockResolvedValue({ id: 'biz-1', name: 'Mi Negocio', status: 'rejected' } as never);

    await handleSubscriptionDeleted({
      id: 'sub_old',
      status: 'canceled',
      metadata: { businessId: 'biz-1' },
      customer: 'cus_1',
    } as any);

    expect(businessUpdateMock).not.toHaveBeenCalled();
  });

  it('ignores stale subscription ids that do not match the business current subscription', async () => {
    businessFindUniqueMock.mockResolvedValue({
      id: 'biz-1',
      status: 'approved',
      subscriptionId: 'sub_current',
      owner: { id: 'user-1', role: 'consumer' },
    } as never);

    await syncSubscriptionStatus({
      id: 'sub_old',
      status: 'active',
      metadata: { businessId: 'biz-1' },
      trial_end: null,
      customer: 'cus_1',
    } as any);

    expect(businessUpdateMock).not.toHaveBeenCalled();
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});

describe('setup checkout completion', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stripeMocks.setupIntentsRetrieve.mockResolvedValue({ id: 'seti_1', payment_method: 'pm_1' });
  });

  it('stores the Stripe customer and default payment method without approving the business', async () => {
    businessUpdateMock.mockResolvedValue({ id: 'biz-1' } as never);

    await handleSetupCheckoutCompleted({
      id: 'cs_setup',
      mode: 'setup',
      customer: 'cus_1',
      setup_intent: 'seti_1',
      metadata: { businessId: 'biz-1' },
    } as any);

    expect(stripeMocks.customersUpdate).toHaveBeenCalledWith('cus_1', {
      invoice_settings: { default_payment_method: 'pm_1' },
    });
    expect(businessUpdateMock).toHaveBeenCalledWith({
      where: { id: 'biz-1' },
      data: { stripeCustomerId: 'cus_1' },
    });
    expect(userUpdateMock).not.toHaveBeenCalled();
  });
});
