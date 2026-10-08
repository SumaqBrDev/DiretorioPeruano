// tests/beta-exit-billing.test.ts
import { describe, it, expect } from 'vitest';
import { buildBetaExitSubscriptionParams } from '../netlify/functions/lib/betaExitBilling';

const PRICE = 'price_123';
const COUPON = 'jxXuej7U';

describe('buildBetaExitSubscriptionParams — businesses onboarded during the beta', () => {
  // Business rule: businesses that joined during the controlled beta are
  // early adopters. On beta exit they get the 3-month discount coupon and go
  // straight to the normal R$59 subscription — NOT another free trial.
  it('applies the early-bird coupon', () => {
    const params = buildBetaExitSubscriptionParams({
      customerId: 'cus_1',
      businessId: 'biz_1',
      priceId: PRICE,
      couponId: COUPON,
      trialDays: 30,
    });

    expect(params.discounts).toEqual([{ coupon: COUPON }]);
  });

  it('does NOT grant a trial to a beta business', () => {
    const params = buildBetaExitSubscriptionParams({
      customerId: 'cus_1',
      businessId: 'biz_1',
      priceId: PRICE,
      couponId: COUPON,
      trialDays: 30,
    });

    expect(params.trial_period_days).toBeUndefined();
  });

  it('bills the normal price against the right customer and business', () => {
    const params = buildBetaExitSubscriptionParams({
      customerId: 'cus_1',
      businessId: 'biz_1',
      priceId: PRICE,
      couponId: COUPON,
      trialDays: 30,
    });

    expect(params.customer).toBe('cus_1');
    expect(params.items).toEqual([{ price: PRICE }]);
    expect(params.metadata).toEqual({ businessId: 'biz_1' });
  });

  it('requires a payment method so an unpaid subscription cannot silently continue', () => {
    const params = buildBetaExitSubscriptionParams({
      customerId: 'cus_1',
      businessId: 'biz_1',
      priceId: PRICE,
      couponId: COUPON,
      trialDays: 30,
    });

    expect(params.payment_behavior).toBe('default_incomplete');
    expect(params.payment_settings).toEqual({ save_default_payment_method: 'on_subscription' });
  });

  // Safety net: if the coupon is not configured we must NOT silently fall back
  // to a free trial the owner was never promised. Bill normally instead.
  it('falls back to a plain subscription when no coupon is configured', () => {
    const params = buildBetaExitSubscriptionParams({
      customerId: 'cus_1',
      businessId: 'biz_1',
      priceId: PRICE,
      couponId: '',
      trialDays: 30,
    });

    expect(params.discounts).toBeUndefined();
    expect(params.trial_period_days).toBeUndefined();
  });
});

describe('resolveBetaExitStatus', () => {
  it('marks a coupon-discounted beta business as active, not trial', async () => {
    const { resolveBetaExitStatus } = await import('../netlify/functions/lib/betaExitBilling');
    expect(resolveBetaExitStatus({ hasCoupon: true })).toBe('active');
  });

  it('marks a business without coupon as active too — it is being billed', async () => {
    const { resolveBetaExitStatus } = await import('../netlify/functions/lib/betaExitBilling');
    expect(resolveBetaExitStatus({ hasCoupon: false })).toBe('active');
  });
});
