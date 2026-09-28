import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { findUnique: vi.fn() },
    businessAd: { create: vi.fn(), update: vi.fn() },
    siteConfig: { findUnique: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  requireBusinessOwner: vi.fn(),
}));

vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: vi.fn(() => ({
    checkout: { sessions: { create: vi.fn(async () => ({ id: 'cs_test', url: 'https://checkout.stripe.test' })) } },
  })),
}));

import { handler } from '../netlify/functions/ad-checkout';
import prisma from '../netlify/functions/lib/prisma';
import { requireBusinessOwner } from '../netlify/functions/lib/auth';

const ownerMock = vi.mocked(requireBusinessOwner);
const businessFindMock = vi.mocked(prisma.businessProfile.findUnique);
const adCreateMock = vi.mocked(prisma.businessAd.create);
const configFindMock = vi.mocked(prisma.siteConfig.findUnique);

beforeEach(() => {
  vi.clearAllMocks();
  ownerMock.mockResolvedValue({ ok: true, ownerBusinessId: 'biz-1' } as any);
  configFindMock.mockResolvedValue({ id: 'singleton', betaMode: true } as any);
});

describe('ad-checkout serialization', () => {
  it('selects stripeCustomerId and serializes nullable beta endsAt safely', async () => {
    businessFindMock.mockResolvedValue({ id: 'biz-1', name: 'Chifa', status: 'approved', subscriptionStatus: 'active', stripeCustomerId: 'cus_1' } as any);
    adCreateMock.mockResolvedValue({ id: 'ad-1', endsAt: null } as any);

    const res = await handler({ httpMethod: 'POST', headers: {}, body: JSON.stringify({ businessId: 'biz-1', title: 'Promo' }) } as any);

    expect(res.statusCode).toBe(200);
    expect(businessFindMock).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({ stripeCustomerId: true }),
    }));
    expect(JSON.parse(res.body)).toMatchObject({ adId: 'ad-1', betaMode: true, endsAt: null });
  });
});
