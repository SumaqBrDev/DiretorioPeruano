/**
 * Clerk webhook primitives: signature verification and account-deletion policy.
 *
 * Kept free of Prisma/Stripe/network so the security-critical parts (signature
 * checking, replay window, deletion policy) are unit-testable in isolation.
 *
 * Signature verification implements the Svix scheme Clerk uses, with Node's
 * crypto instead of the `svix` package: one less dependency on the delivery
 * path of an endpoint that mutates user data.
 */
import crypto from 'node:crypto';

/** Reject anything older than this to blunt replay attacks. */
const TOLERANCE_SECONDS = 5 * 60;

export type SignatureResult = { ok: true } | { ok: false; error: string };

/**
 * Verify a Svix-signed webhook.
 *
 * Svix signs `${svixId}.${svixTimestamp}.${rawBody}` with HMAC-SHA256, keyed on
 * the base64-decoded part of `whsec_...`. The `svix-signature` header may carry
 * several space-separated `v1,<base64>` values during secret rotation, so any
 * one match is enough.
 *
 * Fails CLOSED: a missing secret or header is a rejection, never a pass. An
 * unauthenticated caller must not be able to delete accounts.
 */
export function verifySvixSignature(input: {
  secret: string;
  body: string;
  svixId: string | undefined;
  svixTimestamp: string | undefined;
  svixSignature: string | undefined;
}): SignatureResult {
  const { secret, body, svixId, svixTimestamp, svixSignature } = input;

  if (!secret) return { ok: false, error: 'webhook secret is not configured' };
  if (!svixId || !svixTimestamp || !svixSignature) {
    return { ok: false, error: 'missing svix headers' };
  }

  const ts = Number(svixTimestamp);
  if (!Number.isFinite(ts)) return { ok: false, error: 'invalid timestamp' };
  const age = Math.abs(Math.floor(Date.now() / 1000) - ts);
  if (age > TOLERANCE_SECONDS) {
    return { ok: false, error: 'timestamp outside tolerance window' };
  }

  let key: Buffer;
  try {
    key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  } catch {
    return { ok: false, error: 'malformed webhook secret' };
  }

  const expected = crypto
    .createHmac('sha256', key)
    .update(`${svixId}.${svixTimestamp}.${body}`)
    .digest('base64');

  // Constant-time compare each candidate; a plain === would leak timing.
  const candidates = svixSignature.split(' ');
  for (const candidate of candidates) {
    const value = candidate.startsWith('v1,') ? candidate.slice(3) : candidate;
    const a = Buffer.from(value);
    const b = Buffer.from(expected);
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return { ok: true };
    }
  }

  return { ok: false, error: 'signature mismatch' };
}

export type AccountDeletionPlan = {
  /**
   * `delete_user` removes the row and lets the schema cascade.
   * `anonymize_user` keeps a stripped row because dependent records (a public
   * business listing, billing history) must not vanish silently.
   */
  action: 'delete_user' | 'anonymize_user';
  unpublishBusiness: boolean;
  cancelSubscriptionId: string | null;
};

/**
 * Decide what deleting a Clerk account means for our own data.
 *
 * Two cases, because they carry different obligations:
 *
 *  - No business: nothing of theirs is published under someone else's eyes.
 *    Hard-delete and let `onDelete: Cascade` clean reviews, posts, votes and
 *    consent records. This is what satisfies an LGPD erasure request.
 *
 *  - Owns a business: the listing is public and other people interact with it.
 *    Leaving it live with a non-existent owner produces an unreachable,
 *    unmanageable business nobody can take down. Unpublish it, cancel billing
 *    so a deleted owner is never charged again, and anonymise the user row
 *    rather than cascading a public profile out of existence mid-flight.
 *
 * Billing is always cancelled when a subscription exists: charging an account
 * that asked to be deleted is indefensible.
 */
export function resolveAccountDeletionPlan(input: {
  hasBusiness: boolean;
  subscriptionId: string | null;
}): AccountDeletionPlan {
  return {
    action: input.hasBusiness ? 'anonymize_user' : 'delete_user',
    unpublishBusiness: input.hasBusiness,
    cancelSubscriptionId: input.subscriptionId ?? null,
  };
}
