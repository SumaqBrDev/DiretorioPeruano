// netlify/functions/lib/subscription.ts
// Pure mapping of Stripe subscription status to the internal status.

/**
 * Map Stripe subscription status to our internal status.
 */
export function mapSubscriptionStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'trialing':
      return 'trial';
    case 'active':
      return 'active';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'unpaid':
      return 'canceled';
    case 'incomplete':
    case 'incomplete_expired':
      return 'none';
    default:
      return 'none';
  }
}
