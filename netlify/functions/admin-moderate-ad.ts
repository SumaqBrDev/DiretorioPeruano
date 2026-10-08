// netlify/functions/admin-moderate-ad.ts
// Ad moderation: a super admin approves or rejects a submitted ad.
//
// Approve  → status 'active', and the paid 30-day window STARTS NOW. The
//            advertiser must not lose paid days while waiting for review.
// Reject   → a reason is MANDATORY and is stored on the row. Up to 3 reviews
//            per ad (lib/adModeration): the first two leave it correctable
//            ('inactive_for_review'); the third terminates it AND refunds,
//            because an ad that never reached the public means no advertising
//            service was delivered. Keeping that payment would be void under
//            CDC art. 51, II regardless of accepted terms, so the deterrent
//            against repeat offenders is losing access, not the R$30.
// Reject an ALREADY PUBLISHED ad → 'disabled_breach' with NO refund: the
//            exhibition actually happened. This is the only no-refund path.
import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { requireSuperAdmin } from './lib/auth';
import { resolveRejectionOutcome } from './lib/adModeration';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const AD_DAYS = parseInt(process.env.AD_DAYS || '30', 10);

/** States that can no longer be moderated. */
const TERMINAL_STATUSES = new Set(['rejected_final', 'disabled_breach', 'expired']);

/**
 * Refund the ad's one-time payment.
 *
 * `stripePaymentId` holds a Checkout Session id, so the PaymentIntent has to
 * be resolved first. Returns the failure message instead of throwing: a
 * refund problem must not block the moderation decision, and it must never be
 * reported as a successful refund.
 */
async function refundAdPayment(
  sessionId: string
): Promise<{ refunded: boolean; error?: string }> {
  try {
    const stripe = getStripe();
    const session: any = await stripe.checkout.sessions.retrieve(sessionId);
    const paymentIntent =
      typeof session?.payment_intent === 'string'
        ? session.payment_intent
        : session?.payment_intent?.id;

    if (!paymentIntent) {
      return { refunded: false, error: 'no payment_intent on session' };
    }

    await stripe.refunds.create({ payment_intent: paymentIntent });
    return { refunded: true };
  } catch (error) {
    return { refunded: false, error: (error as Error).message };
  }
}

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const auth = await requireSuperAdmin(event);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode ?? 403,
      headers,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { adId, action, reason } = body;

    if (!adId || (action !== 'approve' && action !== 'reject')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'adId e action ("approve" | "reject") são obrigatórios.' }),
      };
    }

    const ad = await prisma.businessAd.findUnique({
      where: { id: adId },
      select: { id: true, status: true, reviewAttempts: true, stripePaymentId: true },
    });

    if (!ad) {
      return { statusCode: 404, headers, body: JSON.stringify({ error: 'Anúncio não encontrado.' }) };
    }

    if (TERMINAL_STATUSES.has(ad.status)) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: `Anúncio já encerrado (${ad.status}) e não pode ser moderado novamente.`,
        }),
      };
    }

    if (action === 'approve') {
      const now = new Date();
      const endsAt = new Date(now.getTime() + AD_DAYS * 24 * 60 * 60 * 1000);

      await prisma.businessAd.update({
        where: { id: ad.id },
        data: {
          status: 'active',
          moderationReason: null,
          reviewedAt: now,
          reviewedBy: auth.clerkId,
          startsAt: now,
          endsAt,
        },
      });

      console.log(`[moderate-ad] ${ad.id} approved by ${auth.clerkId} — live until ${endsAt.toISOString()}`);

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ adId: ad.id, status: 'active', endsAt: endsAt.toISOString() }),
      };
    }

    // ── reject ────────────────────────────────────────────────────────────
    // The reason is mandatory: a block with no stated motive reads as a system
    // error rather than a decision, and the advertiser cannot fix what they
    // were never told.
    if (!reason || !String(reason).trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'O motivo da reprovação é obrigatório.' }),
      };
    }

    const wasPublished = ad.status === 'active';
    const outcome = resolveRejectionOutcome({
      previousAttempts: ad.reviewAttempts ?? 0,
      wasPublished,
    });

    let refunded = false;
    let refundError: string | undefined;

    // Only a never-published ad is refunded, and only when it was actually
    // charged (beta ads carry no payment).
    if (outcome.refund && ad.stripePaymentId) {
      const result = await refundAdPayment(ad.stripePaymentId);
      refunded = result.refunded;
      refundError = result.error;
    }

    const now = new Date();
    await prisma.businessAd.update({
      where: { id: ad.id },
      data: {
        status: outcome.status,
        moderationReason: String(reason).trim().slice(0, 500),
        reviewAttempts: outcome.attemptsUsed,
        reviewedAt: now,
        reviewedBy: auth.clerkId,
        // Stamped only on a refund that actually succeeded.
        ...(refunded ? { refundedAt: now } : {}),
      },
    });

    console.log(
      `[moderate-ad] ${ad.id} rejected by ${auth.clerkId} → ${outcome.status} ` +
        `(attempt ${outcome.attemptsUsed}/${outcome.attemptsUsed + outcome.attemptsRemaining}, refunded=${refunded})`
    );

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        adId: ad.id,
        status: outcome.status,
        attemptsUsed: outcome.attemptsUsed,
        attemptsRemaining: outcome.attemptsRemaining,
        terminal: outcome.terminal,
        refunded,
        ...(refundError ? { refundError } : {}),
      }),
    };
  } catch (error: any) {
    console.error('[moderate-ad] error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao moderar o anúncio', details: error.message }),
    };
  }
};
