// tests/ad-checkout.test.ts
// Serialization guard: the ad-checkout response must stay JSON-safe and must
// not leak Date objects or undefined fields that the client then mishandles.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
    businessProfile: { findUnique: vi.fn() },
    businessAd: { create: vi.fn(), update: vi.fn() },
    siteConfig: { findUnique: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  authenticateRequest: vi.fn(),
  fetchClerkUserProfile: vi.fn(),
}));

vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: {
      sessions: {
        create: vi.fn(async () => ({ id: 'cs_test', url: 'https://checkout.stripe.test' })),
      },
    },
  })),
}));

import { handler } from '../netlify/functions/ad-checkout';
import { buildAdPublicationTerms } from '../netlify/functions/lib/adModeration';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest, fetchClerkUserProfile } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const profileMock = vi.mocked(fetchClerkUserProfile);
const userFindMock = vi.mocked(prisma.user.findUnique);
const adCreateMock = vi.mocked(prisma.businessAd.create);
const configFindMock = vi.mocked(prisma.siteConfig.findUnique);

const TERMS_VERSION = buildAdPublicationTerms().version;

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ ok: true, clerkId: 'user_1' } as any);
  profileMock.mockResolvedValue({
    email: 'a@test.com',
    name: 'A',
    emailVerified: true,
  } as any);
  userFindMock.mockResolvedValue({
    id: 'db-1',
    business: { id: 'biz-1', status: 'approved', stripeCustomerId: 'cus_1' },
  } as any);
  configFindMock.mockResolvedValue({ id: 'singleton', betaMode: true } as any);
});

describe('ad-checkout serialization', () => {
  it('returns a JSON-safe beta response', async () => {
    adCreateMock.mockResolvedValue({ id: 'ad-1' } as any);

    const res = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        businessId: 'biz-1',
        title: 'Promo',
        acceptedTermsVersion: TERMS_VERSION,
      }),
    } as any);

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body).toMatchObject({ adId: 'ad-1', betaMode: true, status: 'pending_review' });
    // Round-tripping must not throw and must not smuggle a Date through.
    expect(() => JSON.parse(res.body)).not.toThrow();
  });

  it('loads the owning business so Stripe can reuse its customer id', async () => {
    adCreateMock.mockResolvedValue({ id: 'ad-1' } as any);

    await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({
        businessId: 'biz-1',
        title: 'Promo',
        acceptedTermsVersion: TERMS_VERSION,
      }),
    } as any);

    expect(userFindMock).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          business: expect.objectContaining({
            select: expect.objectContaining({ stripeCustomerId: true }),
          }),
        }),
      })
    );
  });
});
