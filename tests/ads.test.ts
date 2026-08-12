// tests/ads.test.ts
// Paid community ads (Opción A+B) — validación de reglas de negocio:
// solo negocios aprobados CON suscripción activa pueden comprar; beta mode
// activa el anuncio sin Stripe; webhook checkout.session.completed lo activa.
// Pure logic with mocked prisma/auth — no DATABASE_URL needed.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { findUnique: vi.fn() },
    businessAd: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
    siteConfig: { findUnique: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  requireBusinessOwner: vi.fn(),
}));

vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ id: 'cs_test_1', url: 'https://checkout.stripe.com/c/pay/test' })),
      },
    },
  })),
}));

import { handler as adCheckoutHandler } from '../netlify/functions/ad-checkout';
import { handleAdCheckoutCompleted } from '../netlify/functions/stripe-webhook';
import prisma from '../netlify/functions/lib/prisma';
import { requireBusinessOwner } from '../netlify/functions/lib/auth';

const ownerMock = vi.mocked(requireBusinessOwner);
const businessFindMock = vi.mocked(prisma.businessProfile.findUnique);
const adCreateMock = vi.mocked(prisma.businessAd.create);
const adFindMock = vi.mocked(prisma.businessAd.findUnique);
const adUpdateMock = vi.mocked(prisma.businessAd.update);
const configFindMock = vi.mocked(prisma.siteConfig.findUnique);

function postEvent(body: unknown) {
  return {
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  ownerMock.mockResolvedValue({ ok: true, clerkId: 'user_test', ownerBusinessId: 'biz-1' } as any);
  configFindMock.mockResolvedValue({ id: 'singleton', betaMode: true } as any);
});

describe('ad-checkout rules', () => {
  it('rejects when businessId or title are missing', async () => {
    const res = await adCheckoutHandler(postEvent({ businessId: 'biz-1' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('título');
  });

  it('rejects when the business is not approved', async () => {
    businessFindMock.mockResolvedValue({ id: 'biz-1', status: 'pending', subscriptionStatus: 'active' } as any);
    const res = await adCheckoutHandler(postEvent({ businessId: 'biz-1', title: 'Promo' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('aprobado');
  });

  it('rejects when the subscription is NOT active (rule: solo suscritos)', async () => {
    businessFindMock.mockResolvedValue({ id: 'biz-1', status: 'approved', subscriptionStatus: 'trial' } as any);
    const res = await adCheckoutHandler(postEvent({ businessId: 'biz-1', title: 'Promo' }));
    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toContain('suscripción activa');
  });

  it('grants the ad immediately in beta mode (no Stripe call)', async () => {
    businessFindMock.mockResolvedValue({ id: 'biz-1', status: 'approved', subscriptionStatus: 'active' } as any);
    adCreateMock.mockResolvedValue({ id: 'ad-1', endsAt: new Date('2026-09-11T00:00:00Z') } as any);
    const res = await adCheckoutHandler(postEvent({ businessId: 'biz-1', title: 'Promo de ceviche' }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.betaMode).toBe(true);
    expect(body.adId).toBe('ad-1');
    expect(adCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: 'biz-1',
          title: 'Promo de ceviche',
          status: 'active',
        }),
      })
    );
  });

  it('creates a pending ad + checkout session when NOT in beta mode', async () => {
    configFindMock.mockResolvedValue({ id: 'singleton', betaMode: false } as any);
    businessFindMock.mockResolvedValue({
      id: 'biz-1',
      name: 'Cantina Don José',
      status: 'approved',
      subscriptionStatus: 'active',
      stripeCustomerId: 'cus_test',
    } as any);
    adCreateMock.mockResolvedValueOnce({ id: 'ad-2' } as any);
    adUpdateMock.mockResolvedValue({ id: 'ad-2' } as any);

    const res = await adCheckoutHandler(postEvent({ businessId: 'biz-1', title: 'Promo de ceviche' }));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.betaMode).toBe(false);
    expect(body.url).toContain('checkout.stripe.com');
    expect(body.adId).toBe('ad-2');
    // The ad was created as pending, then the session id persisted
    expect(adCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending' }),
      })
    );
    expect(adUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripePaymentId: 'cs_test_1' }),
      })
    );
  });
});

describe('ad activation via webhook (checkout.session.completed)', () => {
  it('activates a pending ad with +30 days when metadata.adId exists', async () => {
    adFindMock.mockResolvedValue({ id: 'ad-1', status: 'pending' } as any);
    adUpdateMock.mockResolvedValue({ id: 'ad-1', status: 'active' } as any);

    await handleAdCheckoutCompleted({ id: 'cs_123', metadata: { adId: 'ad-1' } } as any);

    expect(adFindMock).toHaveBeenCalledWith({ where: { id: 'ad-1' }, select: { id: true, status: true } });
    expect(adUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ad-1' },
        data: expect.objectContaining({
          status: 'active',
          startsAt: expect.any(Date),
          endsAt: expect.any(Date),
        }),
      })
    );
    const updateArg = adUpdateMock.mock.calls[0][0] as any;
    const dayMs = 24 * 60 * 60 * 1000;
    const duration = updateArg.data.endsAt.getTime() - updateArg.data.startsAt.getTime();
    expect(duration).toBe(30 * dayMs);
  });

  it('skips activation when the ad is already active (idempotent)', async () => {
    adFindMock.mockResolvedValue({ id: 'ad-1', status: 'active' } as any);

    await handleAdCheckoutCompleted({ id: 'cs_123', metadata: { adId: 'ad-1' } } as any);

    expect(adUpdateMock).not.toHaveBeenCalled();
  });

  it('skips sessions without adId metadata (not an ad payment)', async () => {
    await handleAdCheckoutCompleted({ id: 'cs_456', metadata: {} } as any);

    expect(adFindMock).not.toHaveBeenCalled();
    expect(adUpdateMock).not.toHaveBeenCalled();
  });
});
