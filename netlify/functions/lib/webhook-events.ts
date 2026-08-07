// netlify/functions/lib/webhook-events.ts
// Pure functions for WebhookEvent table operations (idempotency support).

import prisma from './prisma';

/**
 * Check if a Stripe event has already been processed (idempotency guard).
 * Returns the existing WebhookEvent record, or null if this is the first time.
 */
export async function checkIdempotency(stripeEventId: string) {
  return prisma.webhookEvent.findUnique({
    where: { stripeEventId },
  });
}

/**
 * Record a processed Stripe event in the WebhookEvent table.
 */
export async function markEventProcessed(
  stripeEventId: string,
  type: string,
  payload?: unknown
) {
  return prisma.webhookEvent.create({
    data: {
      stripeEventId,
      type,
      payload: payload ?? undefined,
      processedAt: new Date(),
    },
  });
}