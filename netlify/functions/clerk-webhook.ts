// netlify/functions/clerk-webhook.ts
// Clerk → app synchronisation. Today it handles exactly one event:
// `user.deleted`.
//
// Why this exists: Clerk owns identity, this database owns everything the user
// produced. Without this endpoint, deleting an account in Clerk removed the
// login and left the User row, the public BusinessProfile, its ads, reviews,
// community posts and consent records untouched — a listing visible to
// everyone whose owner no longer exists and which nobody can edit or take
// down. It also left an LGPD erasure request unsatisfied.
import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { verifySvixSignature, resolveAccountDeletionPlan } from './lib/clerkWebhook';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

// Read lazily, not at module load: Netlify injects env vars per invocation and
// a module-level snapshot would freeze whatever existed at cold start.
const getClerkWebhookSecret = () => process.env.CLERK_WEBHOOK_SECRET || '';

/** Header lookup is case-insensitive: proxies normalise differently. */
function header(event: HandlerEvent, name: string): string | undefined {
  const direct = event.headers?.[name];
  if (direct) return direct;
  const lower = name.toLowerCase();
  for (const [k, v] of Object.entries(event.headers || {})) {
    if (k.toLowerCase() === lower) return v as string;
  }
  return undefined;
}

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const rawBody = event.body || '';

  // Verify BEFORE parsing: an unauthenticated caller must never reach the
  // deletion path, and the signature covers the exact bytes received.
  const verification = verifySvixSignature({
    secret: getClerkWebhookSecret(),
    body: rawBody,
    svixId: header(event, 'svix-id'),
    svixTimestamp: header(event, 'svix-timestamp'),
    svixSignature: header(event, 'svix-signature'),
  });

  if (!verification.ok) {
    console.warn(`[clerk-webhook] rejected: ${verification.error}`);
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Invalid signature' }),
    };
  }

  let payload: { type?: string; data?: { id?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  // Unhandled event types are acknowledged, not errored: Svix retries on
  // non-2xx and would hammer the endpoint for events we simply ignore.
  if (payload.type !== 'user.deleted') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ ignored: payload.type ?? 'unknown' }),
    };
  }

  const clerkId = payload.data?.id;
  if (!clerkId) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing user id' }) };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { clerkId },
      include: { business: { select: { id: true, subscriptionId: true } } },
    });

    // Already gone, or never synced: acknowledge so Svix stops retrying.
    if (!user) {
      // Log the success too, not just failures: an invocation that leaves no
      // trace is indistinguishable from one that never arrived.
      console.log(`[clerk-webhook] user.deleted for ${clerkId}: no local user, nothing to do`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ result: 'no_local_user' }),
      };
    }

    const plan = resolveAccountDeletionPlan({
      hasBusiness: Boolean(user.business),
      subscriptionId: user.business?.subscriptionId ?? null,
    });

    // Cancel billing first: charging an account that asked to be deleted is
    // indefensible, and a Stripe failure must not abort the data cleanup.
    if (plan.cancelSubscriptionId) {
      try {
        await getStripe().subscriptions.cancel(plan.cancelSubscriptionId);
      } catch (stripeError) {
        console.error(
          `[clerk-webhook] could not cancel subscription ${plan.cancelSubscriptionId}:`,
          stripeError
        );
      }
    }

    if (plan.unpublishBusiness && user.business) {
      await prisma.businessProfile.update({
        where: { id: user.business.id },
        data: {
          status: 'disabled',
          subscriptionStatus: 'canceled',
          subscriptionId: null,
          disabledAt: new Date(),
        },
      });
      // Ads die with the listing: a paid placement pointing at a delisted
      // business is a broken promise to whoever clicks it.
      // NOTE: BusinessAd.status uses British "cancelled" (see schema), unlike
      // BusinessProfile.subscriptionStatus which uses Stripe's "canceled".
      await prisma.businessAd.updateMany({
        where: { businessId: user.business.id, status: 'active' },
        data: { status: 'cancelled' },
      });
    }

    if (plan.action === 'delete_user') {
      // Schema cascades reviews, posts, votes and consent records.
      await prisma.user.delete({ where: { id: user.id } });
    } else {
      // Keep the row so the (now unpublished) business keeps a valid owner
      // reference, but strip every personal identifier.
      await prisma.user.update({
        where: { id: user.id },
        data: {
          clerkId: null,
          email: null,
          name: null,
          dataClassification: 'anonymized',
          dataClassifiedAt: new Date(),
        },
      });
    }

    console.log(`[clerk-webhook] user.deleted handled for ${clerkId}: ${plan.action}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        result: plan.action,
        businessUnpublished: plan.unpublishBusiness,
        subscriptionCanceled: Boolean(plan.cancelSubscriptionId),
      }),
    };
  } catch (error) {
    console.error('[clerk-webhook] error handling user.deleted:', error);
    // 500 lets Svix retry — the account must not stay half-deleted.
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal error' }),
    };
  }
};
