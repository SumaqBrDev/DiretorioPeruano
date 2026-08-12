// tests/finance.test.ts
// Admin financial dashboard (admin-finance.ts) — resumen de ingresos por
// suscripción y por anuncios + tablas detalladas. Solo superadmin puede
// acceder. Pure logic with mocked prisma/auth — no DATABASE_URL needed.

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { findMany: vi.fn() },
    businessAd: { findMany: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  requireSuperAdmin: vi.fn(),
}));

import { handler } from '../netlify/functions/admin-finance';
import prisma from '../netlify/functions/lib/prisma';
import { requireSuperAdmin } from '../netlify/functions/lib/auth';

const superAdminMock = vi.mocked(requireSuperAdmin);
const subsFindMock = vi.mocked(prisma.businessProfile.findMany);
const adsFindMock = vi.mocked(prisma.businessAd.findMany);

function getEvent() {
  return { httpMethod: 'GET', headers: {} };
}

const now = new Date('2026-08-13T00:00:00Z');
const past = new Date('2026-08-01T00:00:00Z');
const future = new Date('2026-09-01T00:00:00Z');

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(now);
  superAdminMock.mockResolvedValue({ ok: true, clerkId: 'superadmin_test' } as any);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('admin-finance access control', () => {
  it('rejects non-GET methods', async () => {
    const res = await handler({ httpMethod: 'POST', headers: {} });
    expect(res.statusCode).toBe(405);
  });

  it('rejects users without superadmin role', async () => {
    superAdminMock.mockResolvedValue({ ok: false, statusCode: 403, error: 'Acceso denegado' } as any);
    const res = await handler(getEvent());
    expect(res.statusCode).toBe(403);
  });
});

describe('admin-finance revenue summary', () => {
  it('computes subscription + ad revenue and detailed tables', async () => {
    subsFindMock.mockResolvedValue([
      {
        id: 'biz-1',
        name: 'Cantina Don José',
        status: 'approved',
        subscriptionStatus: 'active',
        subscriptionId: 'sub_1',
        trialEndsAt: null,
        approvedAt: past,
        createdAt: past,
        updatedAt: past,
        owner: { email: 'owner@test.com', name: 'QA Owner' },
      },
      {
        id: 'biz-2',
        name: 'Mercado Andino',
        status: 'approved',
        subscriptionStatus: 'active',
        subscriptionId: 'sub_2',
        trialEndsAt: null,
        approvedAt: past,
        createdAt: past,
        updatedAt: past,
        owner: { email: 'owner2@test.com', name: 'Otro Owner' },
      },
    ] as any);

    adsFindMock.mockResolvedValue([
      {
        id: 'ad-1',
        businessId: 'biz-1',
        title: 'Promo de ceviche',
        status: 'active',
        startsAt: past,
        endsAt: future,
        createdAt: past,
        stripePaymentId: 'cs_test_1',
        business: { id: 'biz-1', name: 'Cantina Don José' },
      },
      {
        id: 'ad-2',
        businessId: 'biz-2',
        title: 'Oferta de fin de semana',
        status: 'expired',
        startsAt: past,
        endsAt: past,
        createdAt: past,
        stripePaymentId: 'cs_test_2',
        business: { id: 'biz-2', name: 'Mercado Andino' },
      },
    ] as any);

    const res = await handler(getEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);

    // 2 active subscriptions × R$59 (5900 cents) = 11800
    expect(body.summary.activeSubscriptions).toBe(2);
    expect(body.summary.subRevenueCents).toBe(11800);
    // 2 paid ads (active + expired, both paid) × R$30 (3000) = 6000
    expect(body.summary.totalAdsPaid).toBe(2);
    expect(body.summary.activeAds).toBe(1);
    expect(body.summary.adRevenueCents).toBe(6000);
    expect(body.summary.totalRevenueCents).toBe(17800);

    expect(body.subscriptions.length).toBe(2);
    expect(body.subscriptions[0].businessName).toBe('Cantina Don José');
    expect(body.subscriptions[0].ownerEmail).toBe('owner@test.com');

    expect(body.ads.length).toBe(2);
    expect(body.ads[0].businessName).toBe('Cantina Don José');
  });

  it('handles empty data (no subscriptions, no ads)', async () => {
    subsFindMock.mockResolvedValue([]);
    adsFindMock.mockResolvedValue([]);

    const res = await handler(getEvent());
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.summary.activeSubscriptions).toBe(0);
    expect(body.summary.subRevenueCents).toBe(0);
    expect(body.summary.adRevenueCents).toBe(0);
    expect(body.summary.totalRevenueCents).toBe(0);
    expect(body.subscriptions).toEqual([]);
    expect(body.ads).toEqual([]);
  });
});
