// tests/subscription.test.ts
import { describe, it, expect } from 'vitest';
import { mapSubscriptionStatus } from '../netlify/functions/lib/subscription';

describe('mapSubscriptionStatus (stripe-webhook status mapping)', () => {
  it('maps trialing to trial', () => {
    expect(mapSubscriptionStatus('trialing')).toBe('trial');
  });

  it('maps active to active', () => {
    expect(mapSubscriptionStatus('active')).toBe('active');
  });

  it('maps past_due to past_due', () => {
    expect(mapSubscriptionStatus('past_due')).toBe('past_due');
  });

  it('maps canceled and unpaid to canceled', () => {
    expect(mapSubscriptionStatus('canceled')).toBe('canceled');
    expect(mapSubscriptionStatus('unpaid')).toBe('canceled');
  });

  it('maps incomplete / incomplete_expired / unknown to none', () => {
    expect(mapSubscriptionStatus('incomplete')).toBe('none');
    expect(mapSubscriptionStatus('incomplete_expired')).toBe('none');
    expect(mapSubscriptionStatus('weird_status')).toBe('none');
  });
});
