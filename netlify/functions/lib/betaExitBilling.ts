/**
 * Billing decisions for the beta → production transition.
 *
 * Two populations must be treated differently, and mixing them up breaks a
 * promise made to the earliest adopters:
 *
 *   - Businesses onboarded DURING the controlled beta are early adopters.
 *     On beta exit they receive the early-bird coupon (3 months of discount)
 *     and move straight onto the normal monthly subscription. They already
 *     had free months during the beta, so another free trial would both
 *     double-gift them and, worse, delay the discount they were promised.
 *
 *   - Businesses created AFTER beta exit get the standard 30-day trial and
 *     are disabled if no payment follows. That path lives in `admin-approve`
 *     and is intentionally NOT handled here.
 *
 * Kept as pure functions so the rule is testable without Stripe.
 */

export type BetaExitSubscriptionParams = {
  customer: string;
  items: { price: string }[];
  metadata: { businessId: string };
  payment_behavior: 'default_incomplete';
  payment_settings: { save_default_payment_method: 'on_subscription' };
  discounts?: { coupon: string }[];
  trial_period_days?: number;
};

/**
 * Build the Stripe subscription payload for a business that lived through the
 * beta.
 *
 * `trialDays` is accepted so callers can keep passing their configured value,
 * but it is deliberately NOT applied: a beta business must not receive a
 * second free period. The parameter exists to make that omission explicit at
 * the call site rather than looking like something was forgotten.
 */
export function buildBetaExitSubscriptionParams(input: {
  customerId: string;
  businessId: string;
  priceId: string;
  couponId: string;
  trialDays?: number;
}): BetaExitSubscriptionParams {
  const params: BetaExitSubscriptionParams = {
    customer: input.customerId,
    items: [{ price: input.priceId }],
    metadata: { businessId: input.businessId },
    // Require a payment method up front: an unpaid subscription must never
    // keep a listing alive silently.
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
  };

  // Stripe removed the top-level `coupon` param on subscription create; the
  // supported shape is `discounts: [{ coupon }]`.
  if (input.couponId) {
    params.discounts = [{ coupon: input.couponId }];
  }

  // No trial for beta businesses — see module docblock. If the coupon is
  // missing we still bill normally rather than inventing a free period.
  return params;
}

/**
 * Local subscription status to persist after provisioning a beta business.
 *
 * The business is being billed (with or without a discount), so it is
 * `active` — never `trial`, which would make the dashboard and any
 * trial-expiry logic treat a paying customer as a prospect.
 */
export function resolveBetaExitStatus(_input: { hasCoupon: boolean }): 'active' {
  return 'active';
}
