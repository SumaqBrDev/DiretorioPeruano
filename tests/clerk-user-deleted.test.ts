// tests/clerk-user-deleted.test.ts
import { describe, it, expect } from 'vitest';
import crypto from 'node:crypto';
import {
  verifySvixSignature,
  resolveAccountDeletionPlan,
} from '../netlify/functions/lib/clerkWebhook';

// Svix signs `${id}.${timestamp}.${body}` with the base64 part of whsec_...
function sign(secret: string, id: string, ts: string, body: string): string {
  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const mac = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
  return `v1,${mac}`;
}

const SECRET = 'whsec_' + Buffer.from('super-secret-key-value').toString('base64');

describe('verifySvixSignature', () => {
  const body = JSON.stringify({ type: 'user.deleted', data: { id: 'user_1' } });
  const id = 'msg_1';
  const ts = String(Math.floor(Date.now() / 1000));

  it('accepts a correctly signed payload', () => {
    const res = verifySvixSignature({
      secret: SECRET,
      body,
      svixId: id,
      svixTimestamp: ts,
      svixSignature: sign(SECRET, id, ts, body),
    });
    expect(res.ok).toBe(true);
  });

  it('rejects a tampered body', () => {
    const res = verifySvixSignature({
      secret: SECRET,
      body: JSON.stringify({ type: 'user.deleted', data: { id: 'attacker' } }),
      svixId: id,
      svixTimestamp: ts,
      svixSignature: sign(SECRET, id, ts, body),
    });
    expect(res.ok).toBe(false);
  });

  it('rejects a replayed old timestamp', () => {
    const old = String(Math.floor(Date.now() / 1000) - 60 * 60);
    const res = verifySvixSignature({
      secret: SECRET,
      body,
      svixId: id,
      svixTimestamp: old,
      svixSignature: sign(SECRET, id, old, body),
    });
    expect(res.ok).toBe(false);
    // Narrow the discriminated union before reading the failure reason.
    if (!res.ok) expect(res.error).toMatch(/timestamp/i);
  });

  it('rejects when the secret is not configured — never fail open', () => {
    const res = verifySvixSignature({
      secret: '',
      body,
      svixId: id,
      svixTimestamp: ts,
      svixSignature: sign(SECRET, id, ts, body),
    });
    expect(res.ok).toBe(false);
  });

  it('accepts when one of several space-separated signatures matches', () => {
    const good = sign(SECRET, id, ts, body);
    const res = verifySvixSignature({
      secret: SECRET,
      body,
      svixId: id,
      svixTimestamp: ts,
      svixSignature: `v1,AAAAinvalid ${good}`,
    });
    expect(res.ok).toBe(true);
  });
});

describe('resolveAccountDeletionPlan', () => {
  // No business: nothing is published in anyone else's name, so the account
  // and its cascade can go. LGPD erasure is satisfied by a real delete.
  it('hard-deletes a user with no business', () => {
    const plan = resolveAccountDeletionPlan({ hasBusiness: false, subscriptionId: null });
    expect(plan.action).toBe('delete_user');
    expect(plan.unpublishBusiness).toBe(false);
    expect(plan.cancelSubscriptionId).toBeNull();
  });

  // With a business the row cannot silently survive: a public listing whose
  // owner no longer exists is unreachable and unmanageable. Unpublish and
  // anonymise instead of leaving it live.
  it('unpublishes and anonymises a user who owns a business', () => {
    const plan = resolveAccountDeletionPlan({ hasBusiness: true, subscriptionId: null });
    expect(plan.action).toBe('anonymize_user');
    expect(plan.unpublishBusiness).toBe(true);
  });

  it('cancels an active subscription so a deleted owner is never billed again', () => {
    const plan = resolveAccountDeletionPlan({ hasBusiness: true, subscriptionId: 'sub_123' });
    expect(plan.cancelSubscriptionId).toBe('sub_123');
  });

  it('never bills nor keeps a listing public after deletion', () => {
    const plan = resolveAccountDeletionPlan({ hasBusiness: true, subscriptionId: 'sub_1' });
    expect(plan.unpublishBusiness).toBe(true);
    expect(plan.cancelSubscriptionId).toBe('sub_1');
  });
});
