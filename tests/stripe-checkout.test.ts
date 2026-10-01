// tests/stripe-checkout.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const { stripeMocks } = vi.hoisted(() => ({
  stripeMocks: {
    customersCreate: vi.fn(),
    sessionsCreate: vi.fn(),
  },
}));

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { findUnique: vi.fn(), update: vi.fn() },
    siteConfig: { findUnique: vi.fn() },
  },
}));
vi.mock('../netlify/functions/lib/auth', () => ({ requireBusinessOwner: vi.fn() }));
vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: () => ({
    customers: { create: stripeMocks.customersCreate },
    checkout: { sessions: { create: stripeMocks.sessionsCreate } },
  }),
}));

import { handler } from '../netlify/functions/stripe-checkout';
import prisma from '../netlify/functions/lib/prisma';
import { requireBusinessOwner } from '../netlify/functions/lib/auth';

const ownerAuthMock = vi.mocked(requireBusinessOwner);
const businessFindMock = vi.mocked(prisma.businessProfile.findUnique);
const businessUpdateMock = vi.mocked(prisma.businessProfile.update);
const siteConfigFindMock = vi.mocked(prisma.siteConfig.findUnique);

const postEvent = (businessId = 'biz-1') => ({
  httpMethod: 'POST',
  headers: { origin: 'https://example.test' },
  body: JSON.stringify({ businessId, plan: 'monthly' }),
}) as unknown as HandlerEvent;

describe('stripe-checkout upgrade flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ownerAuthMock.mockResolvedValue({ ok: true } as never);
    siteConfigFindMock.mockResolvedValue({ id: 'singleton', betaMode: false } as never);
    stripeMocks.customersCreate.mockResolvedValue({ id: 'cus_new' });
    stripeMocks.sessionsCreate.mockResolvedValue({ id: 'cs_1', url: 'https://checkout.stripe.test/session' });
  });

  it('creates a setup checkout session for a pending business without starting a subscription', async () => {
    businessFindMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Mi Negocio',
      status: 'pending',
      ownerId: 'user-1',
      stripeCustomerId: null,
      owner: { id: 'user-1', email: 'owner@example.test', name: 'Owner' },
    } as never);
    businessUpdateMock.mockResolvedValue({ id: 'biz-1', stripeCustomerId: 'cus_new' } as never);

    const res = await handler(postEvent());

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ url: 'https://checkout.stripe.test/session', betaMode: false });
    expect(stripeMocks.sessionsCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: 'setup',
        customer: 'cus_new',
        metadata: { businessId: 'biz-1', plan: 'monthly', priceId: 'price_59_brl_monthly' },
        setup_intent_data: { metadata: { businessId: 'biz-1', plan: 'monthly', priceId: 'price_59_brl_monthly' } },
      })
    );
    expect(stripeMocks.sessionsCreate.mock.calls[0][0]).not.toHaveProperty('subscription_data');
  });

  it('does not create checkout when the business already has a subscription', async () => {
    businessFindMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Mi Negocio',
      status: 'approved',
      ownerId: 'user-1',
      stripeCustomerId: 'cus_existing',
      subscriptionId: 'sub_existing',
      owner: { id: 'user-1', email: 'owner@example.test', name: 'Owner' },
    } as never);

    const res = await handler(postEvent());

    expect(res.statusCode).toBe(409);
    expect(JSON.parse(res.body).code).toBe('SUBSCRIPTION_ALREADY_EXISTS');
    expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
  });

  it.each(['rejected', 'disabled'])('rejects %s businesses as not eligible', async (status) => {
    businessFindMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Mi Negocio',
      status,
      ownerId: 'user-1',
      stripeCustomerId: 'cus_existing',
      owner: { id: 'user-1', email: 'owner@example.test', name: 'Owner' },
    } as never);

    const res = await handler(postEvent());

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).code).toBe('BUSINESS_NOT_ELIGIBLE');
    expect(stripeMocks.sessionsCreate).not.toHaveBeenCalled();
  });
});
