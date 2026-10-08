// tests/ads.test.ts
// Paid ads — business rules after the moderation rework:
//   * ANY confirmed account (verified email) may advertise — business owner or
//     community member. Subscription status is NOT consulted: ads are a
//     complementary product, not a subscription benefit.
//   * Submitting for publication requires accepting the current terms.
//   * Payment does not publish: it queues the ad for moderation.
// Pure logic with mocked prisma/auth/stripe — no DATABASE_URL needed.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
    businessProfile: { findUnique: vi.fn() },
    businessAd: { create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
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
        create: vi.fn(async () => ({
          id: 'cs_test_1',
          url: 'https://checkout.stripe.com/c/pay/test',
        })),
      },
    },
  })),
}));

import { handler as adCheckoutHandler } from '../netlify/functions/ad-checkout';
import { handleAdCheckoutCompleted } from '../netlify/functions/stripe-webhook';
import { buildAdPublicationTerms } from '../netlify/functions/lib/adModeration';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest, fetchClerkUserProfile } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const profileMock = vi.mocked(fetchClerkUserProfile);
const userFindMock = vi.mocked(prisma.user.findUnique);
const adCreateMock = vi.mocked(prisma.businessAd.create);
const adFindMock = vi.mocked(prisma.businessAd.findUnique);
const adUpdateMock = vi.mocked(prisma.businessAd.update);
const configFindMock = vi.mocked(prisma.siteConfig.findUnique);

const TERMS_VERSION = buildAdPublicationTerms().version;

function postEvent(body: unknown): any {
  return { httpMethod: 'POST', body: JSON.stringify(body), headers: {} };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ ok: true, clerkId: 'user_test' } as any);
  profileMock.mockResolvedValue({
    email: 'owner@test.com',
    name: 'Owner',
    emailVerified: true,
  } as any);
  userFindMock.mockResolvedValue({
    id: 'db-user-1',
    business: { id: 'biz-1', status: 'approved', stripeCustomerId: 'cus_test' },
  } as any);
  configFindMock.mockResolvedValue({ id: 'singleton', betaMode: true } as any);
});

describe('ad-checkout eligibility', () => {
  it('rejects when the title is missing', async () => {
    const res = await adCheckoutHandler(postEvent({ businessId: 'biz-1' }));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('título');
  });

  it('rejects an unverified email — confirmation is the floor', async () => {
    profileMock.mockResolvedValue({
      email: 'x@test.com',
      name: 'X',
      emailVerified: false,
    } as any);

    const res = await adCheckoutHandler(
      postEvent({ title: 'Promo', acceptedTermsVersion: TERMS_VERSION })
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).reason).toBe('email_not_verified');
    expect(adCreateMock).not.toHaveBeenCalled();
  });

  // Ads are a complementary product: a business on 'none' (the beta default)
  // must still be able to advertise. The old rule made this impossible.
  it('allows advertising with no active subscription', async () => {
    adCreateMock.mockResolvedValue({ id: 'ad-1' } as any);

    const res = await adCheckoutHandler(
      postEvent({ businessId: 'biz-1', title: 'Promo', acceptedTermsVersion: TERMS_VERSION })
    );

    expect(res.statusCode).toBe(200);
  });

  // A community member has no business at all.
  it('allows a confirmed community user with no business', async () => {
    userFindMock.mockResolvedValue({ id: 'db-user-2', business: null } as any);
    adCreateMock.mockResolvedValue({ id: 'ad-c1' } as any);

    const res = await adCheckoutHandler(
      postEvent({ title: 'Clases de quechua', acceptedTermsVersion: TERMS_VERSION })
    );

    expect(res.statusCode).toBe(200);
    expect(adCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: null, userId: 'db-user-2' }),
      })
    );
  });

  it('refuses to attach an ad to a business the caller does not own', async () => {
    userFindMock.mockResolvedValue({
      id: 'db-user-3',
      business: { id: 'biz-mine', status: 'approved' },
    } as any);

    const res = await adCheckoutHandler(
      postEvent({
        businessId: 'biz-someone-else',
        title: 'Promo',
        acceptedTermsVersion: TERMS_VERSION,
      })
    );

    expect(res.statusCode).toBe(403);
    expect(adCreateMock).not.toHaveBeenCalled();
  });

  it('blocks an owner whose business was disabled', async () => {
    userFindMock.mockResolvedValue({
      id: 'db-user-4',
      business: { id: 'biz-1', status: 'disabled' },
    } as any);

    const res = await adCheckoutHandler(
      postEvent({ title: 'Promo', acceptedTermsVersion: TERMS_VERSION })
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).reason).toBe('business_disabled');
  });
});

describe('ad-checkout terms acceptance', () => {
  it('refuses to submit without accepting the current terms', async () => {
    const res = await adCheckoutHandler(postEvent({ businessId: 'biz-1', title: 'Promo' }));

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).requiredTermsVersion).toBe(TERMS_VERSION);
    expect(adCreateMock).not.toHaveBeenCalled();
  });

  it('refuses a stale terms version', async () => {
    const res = await adCheckoutHandler(
      postEvent({ businessId: 'biz-1', title: 'Promo', acceptedTermsVersion: '1999-01-01' })
    );

    expect(res.statusCode).toBe(400);
    expect(adCreateMock).not.toHaveBeenCalled();
  });

  it('records which terms version was accepted, for later disputes', async () => {
    adCreateMock.mockResolvedValue({ id: 'ad-1' } as any);

    await adCheckoutHandler(
      postEvent({ businessId: 'biz-1', title: 'Promo', acceptedTermsVersion: TERMS_VERSION })
    );

    expect(adCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          termsVersion: TERMS_VERSION,
          termsAcceptedAt: expect.any(Date),
        }),
      })
    );
  });

  // A draft is not a submission: nothing was committed to, so no acceptance
  // is required and nothing is charged.
  it('saves a draft without terms or payment', async () => {
    adCreateMock.mockResolvedValue({ id: 'ad-draft' } as any);

    const res = await adCheckoutHandler(
      postEvent({ businessId: 'biz-1', title: 'Rascunho', saveAsDraft: true })
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).status).toBe('draft');
    expect(adCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: 'draft' }) })
    );
  });
});

describe('ad-checkout submission', () => {
  // Beta relaxes billing, never content review.
  it('queues the ad for moderation in beta mode without charging', async () => {
    adCreateMock.mockResolvedValue({ id: 'ad-1' } as any);

    const res = await adCheckoutHandler(
      postEvent({ businessId: 'biz-1', title: 'Promo', acceptedTermsVersion: TERMS_VERSION })
    );
    const body = JSON.parse(res.body);

    expect(body.betaMode).toBe(true);
    expect(body.status).toBe('pending_review');
    expect(adCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_review' }),
      })
    );
  });

  it('creates a pending_payment ad + checkout session outside beta', async () => {
    configFindMock.mockResolvedValue({ id: 'singleton', betaMode: false } as any);
    adCreateMock.mockResolvedValueOnce({ id: 'ad-2' } as any);
    adUpdateMock.mockResolvedValue({ id: 'ad-2' } as any);

    const res = await adCheckoutHandler(
      postEvent({ businessId: 'biz-1', title: 'Promo', acceptedTermsVersion: TERMS_VERSION })
    );
    const body = JSON.parse(res.body);

    expect(body.betaMode).toBe(false);
    expect(body.url).toContain('checkout.stripe.com');
    expect(adCreateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: 'pending_payment' }),
      })
    );
    expect(adUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ stripePaymentId: 'cs_test_1' }),
      })
    );
  });
});

describe('ad payment via webhook (checkout.session.completed)', () => {
  // Paying must NOT publish: unreviewed content would reach the public, which
  // is exactly what moderation exists to prevent.
  it('queues a paid ad for moderation instead of publishing it', async () => {
    adFindMock.mockResolvedValue({ id: 'ad-1', status: 'pending_payment' } as any);
    adUpdateMock.mockResolvedValue({ id: 'ad-1' } as any);

    await handleAdCheckoutCompleted({ id: 'cs_123', metadata: { adId: 'ad-1' } } as any);

    expect(adUpdateMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'ad-1' },
        data: expect.objectContaining({ status: 'pending_review' }),
      })
    );
    // No dates here: the paid window starts on approval, so the advertiser
    // does not lose paid days while waiting for review.
    const data = (adUpdateMock.mock.calls[0][0] as any).data;
    expect(data.startsAt).toBeUndefined();
    expect(data.endsAt).toBeUndefined();
  });

  it('ignores a duplicate webhook for an ad already past payment', async () => {
    adFindMock.mockResolvedValue({ id: 'ad-1', status: 'pending_review' } as any);

    await handleAdCheckoutCompleted({ id: 'cs_123', metadata: { adId: 'ad-1' } } as any);

    expect(adUpdateMock).not.toHaveBeenCalled();
  });

  it('never reverts a published ad back to review', async () => {
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
