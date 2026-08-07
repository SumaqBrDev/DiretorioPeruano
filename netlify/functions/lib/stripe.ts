import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';

let stripeInstance: Stripe | null = null;

/**
 * Shared Stripe client — single source of truth for the API version.
 * Lazy singleton so functions that never touch Stripe pay no cold-start cost.
 */
export function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2026-06-24.dahlia',
    });
  }
  return stripeInstance;
}
