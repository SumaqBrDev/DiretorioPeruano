import { describe, expect, it, vi } from 'vitest';

import {
  getBusinessAccountNavEntry,
  runBusinessUpgradeSubmission,
  runPaymentMethodSetup,
} from '../src/lib/businessUpgradeFlow';
import { ApiError, type ApiBusiness, type CreateBusinessInput } from '../src/lib/api';

const pendingBusiness = {
  id: 'biz-pending',
  name: 'Cevicheria Lima',
  category: 'restaurante',
  status: 'pending',
  subscriptionStatus: 'none',
  createdAt: '2026-09-30T00:00:00.000Z',
} satisfies ApiBusiness;

const approvedBusiness = {
  ...pendingBusiness,
  id: 'biz-approved',
  status: 'approved',
  subscriptionStatus: 'active',
} satisfies ApiBusiness;

const rejectedBusiness = {
  ...pendingBusiness,
  id: 'biz-rejected',
  status: 'rejected',
  rejectionReason: 'Dados incompletos',
} satisfies ApiBusiness;

const businessData = {
  name: 'Cevicheria Lima',
  description: 'Comida peruana tradicional',
  category: 'restaurante',
  ownerId: 'clerk-user-1',
} satisfies CreateBusinessInput;

const noExistingBusinessLookup = vi.fn(async () => {
  throw new ApiError(404, 'not found');
});

describe('getBusinessAccountNavEntry', () => {
  it('sends authenticated consumers with no business to the explicit business registration route', () => {
    expect(getBusinessAccountNavEntry({ business: null, isAdmin: false, isSuperAdmin: false })).toEqual({
      path: '/registrar-negocio',
      labelKey: 'nav.register_business',
      state: 'none',
    });
  });

  it.each([pendingBusiness, rejectedBusiness])('labels %s businesses as private request/status, not approved businesses', (business) => {
    expect(getBusinessAccountNavEntry({ business, isAdmin: false, isSuperAdmin: false })).toEqual({
      path: '/meu-negocio',
      labelKey: 'nav.business_request_status',
      state: business.status,
    });
  });

  it('keeps approved businesses on the existing Meu Negócio experience', () => {
    expect(getBusinessAccountNavEntry({ business: approvedBusiness, isAdmin: false, isSuperAdmin: false })).toEqual({
      path: '/meu-negocio',
      labelKey: 'nav.my_business',
      state: 'approved',
    });
  });

  it('does not add a business account entry for admin/superadmin users', () => {
    expect(getBusinessAccountNavEntry({ business: null, isAdmin: true, isSuperAdmin: false })).toBeNull();
    expect(getBusinessAccountNavEntry({ business: null, isAdmin: false, isSuperAdmin: true })).toBeNull();
  });
});

describe('runBusinessUpgradeSubmission', () => {
  it('short-circuits to the owner panel when an existing business is found before creation', async () => {
    const getMyBusiness = vi.fn(async () => pendingBusiness);
    const markBusinessIntent = vi.fn();
    const createBusiness = vi.fn();
    const openStripeCheckout = vi.fn();

    const result = await runBusinessUpgradeSubmission({
      token: 'token-1',
      businessData,
      getMyBusiness,
      markBusinessIntent,
      createBusiness,
      openStripeCheckout,
    });

    expect(result).toEqual({ kind: 'existing-business', business: pendingBusiness });
    expect(getMyBusiness).toHaveBeenCalledTimes(1);
    expect(markBusinessIntent).not.toHaveBeenCalled();
    expect(createBusiness).not.toHaveBeenCalled();
    expect(openStripeCheckout).not.toHaveBeenCalled();
  });

  it.each([
    ['a real 404', async (calls: string[]) => {
      calls.push('lookup');
      throw new ApiError(404, 'not found');
    }],
    ['null', async (calls: string[]) => {
      calls.push('lookup');
      return null;
    }],
  ])('continues through intent, creation, and setup checkout when the existing-business lookup returns %s', async (_case, lookup) => {
    const calls: string[] = [];
    const getMyBusiness = vi.fn(() => lookup(calls));
    const markBusinessIntent = vi.fn(async () => {
      calls.push('intent');
      return { ok: true };
    });
    const createBusiness = vi.fn(async () => {
      calls.push('create');
      return pendingBusiness;
    });
    const openStripeCheckout = vi.fn(async (_token: string, businessId: string) => {
      calls.push(`checkout:${businessId}`);
      return { url: 'https://checkout.stripe.test/setup' };
    });

    const result = await runBusinessUpgradeSubmission({
      token: 'token-1',
      businessData,
      getMyBusiness,
      markBusinessIntent,
      createBusiness,
      openStripeCheckout,
    });

    expect(result).toEqual({ kind: 'redirect', business: pendingBusiness, url: 'https://checkout.stripe.test/setup' });
    expect(calls).toEqual(['lookup', 'intent', 'create', 'checkout:biz-pending']);
  });

  it('fails closed when the existing-business lookup fails with anything other than a real 404', async () => {
    const getMyBusiness = vi.fn(async () => {
      throw new ApiError(500, 'server unavailable');
    });
    const markBusinessIntent = vi.fn();
    const createBusiness = vi.fn();
    const openStripeCheckout = vi.fn();

    await expect(
      runBusinessUpgradeSubmission({
        token: 'token-1',
        businessData,
        getMyBusiness,
        markBusinessIntent,
        createBusiness,
        openStripeCheckout,
      })
    ).rejects.toThrow('server unavailable');

    expect(markBusinessIntent).not.toHaveBeenCalled();
    expect(createBusiness).not.toHaveBeenCalled();
    expect(openStripeCheckout).not.toHaveBeenCalled();
  });

  it('records business intent before business creation, creates one pending business, then returns the setup checkout URL', async () => {
    const calls: string[] = [];
    const markBusinessIntent = vi.fn(async () => {
      calls.push('intent');
      return { ok: true };
    });
    const createBusiness = vi.fn(async (_token: string, data: CreateBusinessInput) => {
      calls.push(`create:${'role' in data ? 'has-role' : 'no-role'}`);
      return pendingBusiness;
    });
    const openStripeCheckout = vi.fn(async (_token: string, businessId: string) => {
      calls.push(`checkout:${businessId}`);
      return { url: 'https://checkout.stripe.test/setup' };
    });

    const result = await runBusinessUpgradeSubmission({
      token: 'token-1',
      businessData,
      getMyBusiness: noExistingBusinessLookup,
      markBusinessIntent,
      createBusiness,
      openStripeCheckout,
    });

    expect(result).toEqual({ kind: 'redirect', business: pendingBusiness, url: 'https://checkout.stripe.test/setup' });
    expect(calls).toEqual(['intent', 'create:no-role', 'checkout:biz-pending']);
    expect(markBusinessIntent).toHaveBeenCalledTimes(1);
    expect(createBusiness).toHaveBeenCalledTimes(1);
    expect(openStripeCheckout).toHaveBeenCalledTimes(1);
  });

  it('does not create a business when the business-intent call fails', async () => {
    const markBusinessIntent = vi.fn(async () => {
      throw new Error('intent failed');
    });
    const createBusiness = vi.fn();
    const openStripeCheckout = vi.fn();

    await expect(
      runBusinessUpgradeSubmission({
        token: 'token-1',
        businessData,
        getMyBusiness: noExistingBusinessLookup,
        markBusinessIntent,
        createBusiness,
        openStripeCheckout,
      })
    ).rejects.toThrow('intent failed');

    expect(createBusiness).not.toHaveBeenCalled();
    expect(openStripeCheckout).not.toHaveBeenCalled();
  });

  it('keeps the created pending business and exposes owner-panel retry when setup checkout returns no URL', async () => {
    const result = await runBusinessUpgradeSubmission({
      token: 'token-1',
      businessData,
      getMyBusiness: noExistingBusinessLookup,
      markBusinessIntent: vi.fn(async () => ({ ok: true })),
      createBusiness: vi.fn(async () => pendingBusiness),
      openStripeCheckout: vi.fn(async () => ({ url: '', betaMode: true, message: 'checkout not needed' })),
    });

    expect(result).toEqual({ kind: 'owner-panel-retry', business: pendingBusiness, message: 'checkout not needed' });
  });

  it('keeps the created pending business and exposes owner-panel retry when setup checkout throws', async () => {
    const result = await runBusinessUpgradeSubmission({
      token: 'token-1',
      businessData,
      getMyBusiness: noExistingBusinessLookup,
      markBusinessIntent: vi.fn(async () => ({ ok: true })),
      createBusiness: vi.fn(async () => pendingBusiness),
      openStripeCheckout: vi.fn(async () => {
        throw new Error('stripe unavailable');
      }),
    });

    expect(result).toEqual({ kind: 'owner-panel-retry', business: pendingBusiness, message: 'stripe unavailable' });
  });
});

describe('runPaymentMethodSetup', () => {
  it('returns a Stripe URL only when setup-mode checkout provides one', async () => {
    await expect(
      runPaymentMethodSetup({
        token: 'token-1',
        business: pendingBusiness,
        openStripeCheckout: vi.fn(async () => ({ url: 'https://checkout.stripe.test/retry' })),
      })
    ).resolves.toEqual({ kind: 'redirect', url: 'https://checkout.stripe.test/retry' });
  });

  it('does not navigate when setup-mode checkout has no URL', async () => {
    await expect(
      runPaymentMethodSetup({
        token: 'token-1',
        business: pendingBusiness,
        openStripeCheckout: vi.fn(async () => ({ url: '', betaMode: true, message: 'Modo beta' })),
      })
    ).resolves.toEqual({ kind: 'no-url', message: 'Modo beta' });
  });
});
