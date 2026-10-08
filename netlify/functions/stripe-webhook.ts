import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import Stripe from 'stripe';
import { getStripe } from './lib/stripe';
import { mapSubscriptionStatus } from './lib/subscription';
import { sendPaymentFailedEmail, sendTrialEndingEmail } from './lib/email';
import { checkIdempotency, markEventProcessed } from './lib/webhook-events';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const stripe = getStripe();

class DeferredBusinessApprovalError extends Error {
  constructor(public readonly businessId: string, public readonly status: string) {
    super(`Business ${businessId} is ${status}; retry subscription event after approval commits`);
    this.name = 'DeferredBusinessApprovalError';
  }
}

/**
 * Promote the business owner to role='business'.
 *
 * This is the only place in the codebase that grants the business role: Stripe
 * confirming a subscription is the single trustworthy signal that the upgrade
 * funnel completed. The browser never decides this.
 *
 * Idempotent: an owner already promoted is left untouched.
 */
async function promoteOwnerToBusiness(businessId: string): Promise<void> {
  const business = await prisma.businessProfile.findUnique({
    where: { id: businessId },
    select: { ownerId: true, status: true, owner: { select: { id: true, role: true } } },
  });

  if (!business?.owner) {
    console.warn(`[webhook] business ${businessId} has no owner; skipping role promotion`);
    return;
  }

  if (business.status !== 'approved') {
    console.warn(`[webhook] business ${businessId} is ${business.status}; skipping role promotion`);
    return;
  }

  if (business.owner.role !== 'consumer') {
    return;
  }

  await prisma.user.update({
    where: { id: business.owner.id },
    data: { role: 'business', businessIntentAt: null },
  });
  console.log(`[webhook] promoted user ${business.owner.id} to role=business`);
}

function isTerminalBusinessStatus(status?: string | null): boolean {
  return status === 'rejected' || status === 'disabled';
}

function isStaleSubscription(currentSubscriptionId: string | null | undefined, eventSubscriptionId: string): boolean {
  return !!currentSubscriptionId && currentSubscriptionId !== eventSubscriptionId;
}

/**
 * Sync subscription status to database
 */
export async function syncSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
  const businessId = subscription.metadata?.businessId;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;
  const newStatus = mapSubscriptionStatus(subscription.status);
  const trialEndsAt = subscription.trial_end
    ? new Date(subscription.trial_end * 1000)
    : undefined;

  if (!businessId) {
    console.warn('No businessId in subscription metadata, trying customer fallback');
    if (!customerId) return;

    const business = await prisma.businessProfile.findFirst({
      where: { stripeCustomerId: customerId },
    });
    if (!business) return;

    if (isTerminalBusinessStatus((business as any).status)) {
      console.warn(`[webhook] business ${business.id} is ${(business as any).status}; skipping subscription sync`);
      return;
    }
    if ((business as any).status !== 'approved') {
      throw new DeferredBusinessApprovalError(business.id, (business as any).status ?? 'unknown');
    }
    if (isStaleSubscription((business as any).subscriptionId, subscription.id)) {
      console.warn(`[webhook] subscription ${subscription.id} is stale for business ${business.id}; skipping sync`);
      return;
    }

    await prisma.businessProfile.update({
      where: { id: business.id },
      data: {
        subscriptionStatus: newStatus,
        subscriptionId: subscription.id,
        trialEndsAt,
      },
    });
    console.log(`Synced subscription ${subscription.id} for business ${business.id}: ${newStatus}`);
    if (newStatus === 'trial' || newStatus === 'active') {
      await promoteOwnerToBusiness(business.id);
    }
    return;
  }

  const business = await prisma.businessProfile.findUnique({
    where: { id: businessId },
    select: { id: true, status: true, subscriptionId: true },
  });
  if (!business) {
    console.warn(`No business found for subscription metadata businessId ${businessId}`);
    return;
  }
  if (isTerminalBusinessStatus(business.status)) {
    console.warn(`[webhook] business ${businessId} is ${business.status}; skipping subscription sync`);
    return;
  }
  if (business.status !== 'approved') {
    throw new DeferredBusinessApprovalError(business.id, business.status ?? 'unknown');
  }
  if (isStaleSubscription(business.subscriptionId, subscription.id)) {
    console.warn(`[webhook] subscription ${subscription.id} is stale for business ${businessId}; skipping sync`);
    return;
  }

  await prisma.businessProfile.update({
    where: { id: businessId },
    data: {
      subscriptionStatus: newStatus,
      subscriptionId: subscription.id,
      trialEndsAt,
    },
  });

  console.log(`Synced subscription ${subscription.id} for business ${businessId}: ${newStatus}`);
  if (newStatus === 'trial' || newStatus === 'active') {
    await promoteOwnerToBusiness(businessId);
  }
}

/**
 * Handle invoice payment failed
 */
async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  const customerId = typeof invoice.customer === 'string'
    ? invoice.customer
    : invoice.customer?.id;

  if (!customerId) return;

  const business = await prisma.businessProfile.findFirst({
    where: { stripeCustomerId: customerId },
    include: {
      owner: {
        select: { email: true, name: true },
      },
    },
  });

  if (!business) {
    console.warn(`No business found for customer ${customerId}`);
    return;
  }

  // Mark as past_due
  await prisma.businessProfile.update({
    where: { id: business.id },
    data: { subscriptionStatus: 'past_due' },
  });

  // Send email notification
  if (business.owner?.email) {
    await sendPaymentFailedEmail(business.owner.email, business.name ?? '');
  }
}

/**
 * Handle subscription deleted
 */
export async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const businessId = subscription.metadata?.businessId;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const whereClause = businessId
    ? { id: businessId }
    : { stripeCustomerId: customerId || '' };

  const business = await prisma.businessProfile.findFirst({
    where: whereClause,
    select: { id: true, name: true, status: true, subscriptionId: true },
  });

  if (!business) {
    console.warn('No business found for deleted subscription');
    return;
  }

  if (business.status === 'rejected') {
    console.warn(`[webhook] business ${business.id} is rejected; subscription.deleted will not overwrite status`);
    return;
  }
  if (isStaleSubscription(business.subscriptionId, subscription.id)) {
    console.warn(`[webhook] subscription.deleted ${subscription.id} is stale for business ${business.id}; skipping`);
    return;
  }

  await prisma.businessProfile.update({
    where: { id: business.id },
    data: {
      status: 'disabled',
      subscriptionStatus: 'canceled',
      subscriptionId: null,
      disabledAt: new Date(),
    },
  });

  console.log(`Business ${business.id} subscription deleted — status set to disabled`);
}

/**
 * Handle one-time ad payment (checkout.session.completed): activates the
 * BusinessAd (pending → active, endsAt = now + AD_DAYS).
 * Exported for unit tests.
 */
export async function handleSetupCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const businessId = session.metadata?.businessId;
  const customerId = typeof session.customer === 'string'
    ? session.customer
    : session.customer?.id;
  const setupIntentId = typeof session.setup_intent === 'string'
    ? session.setup_intent
    : session.setup_intent?.id;

  if (!businessId || !customerId || !setupIntentId) {
    console.warn('setup checkout missing businessId, customer, or setup_intent; skipping');
    return;
  }

  const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
  const paymentMethodId = typeof setupIntent.payment_method === 'string'
    ? setupIntent.payment_method
    : setupIntent.payment_method?.id;

  if (!paymentMethodId) {
    console.warn(`setup_intent ${setupIntentId} has no payment method; skipping default payment setup`);
    return;
  }

  await stripe.customers.update(customerId, {
    invoice_settings: { default_payment_method: paymentMethodId },
  });

  await prisma.businessProfile.update({
    where: { id: businessId },
    data: { stripeCustomerId: customerId },
  });
}

export async function handleAdCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  const adId = session.metadata?.adId;
  if (!adId) {
    console.warn('checkout.session.completed without adId metadata — not an ad payment, skipping');
    return;
  }

  const ad = await prisma.businessAd.findUnique({
    where: { id: adId },
    select: { id: true, status: true },
  });
  if (!ad) {
    console.warn(`BusinessAd ${adId} not found for session ${session.id}`);
    return;
  }
  if (ad.status !== 'pending_payment') {
    console.log(
      `BusinessAd ${adId} is '${ad.status}', not 'pending_payment' — skipping (duplicate webhook?)`
    );
    return;
  }

  // Payment does NOT publish the ad: it moves it into the moderation queue.
  // Publishing on payment would put unreviewed content in front of the public,
  // which is exactly what ad moderation exists to prevent. `startsAt`/`endsAt`
  // are set on approval, so the paid 30 days start when the ad goes live.
  await prisma.businessAd.update({
    where: { id: ad.id },
    data: { status: 'pending_review' },
  });
  console.log(`BusinessAd ${adId} paid via session ${session.id} — queued for moderation`);
}

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify Stripe signature
    const sig = event.headers['stripe-signature'] || '';
    const rawBody = event.body || '';

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    if (!webhookSecret) {
      console.warn('STRIPE_WEBHOOK_SECRET not configured, skipping signature verification');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Webhook secret not configured' }),
      };
    }

    let stripeEvent: Stripe.Event;

    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err: any) {
      console.error('Stripe signature verification failed:', err.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Idempotency: skip if this event was already processed
    const eventId = stripeEvent.id || '';
    if (!eventId) {
      console.warn('Stripe event has no id, cannot enforce idempotency — processing anyway');
    }

    const existing = eventId ? await checkIdempotency(eventId) : null;
    if (existing) {
      console.log(`Skipping already-processed event ${eventId} (${stripeEvent.type})`);
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ received: true, duplicate: true }),
      };
    }

    // Handle specific event types
    switch (stripeEvent.type) {
      case 'checkout.session.completed': {
        const session = stripeEvent.data.object as Stripe.Checkout.Session;
        if (session.mode === 'setup' || session.setup_intent) {
          await handleSetupCheckoutCompleted(session);
        } else {
          await handleAdCheckoutCompleted(session);
        }
        await markEventProcessed(eventId, stripeEvent.type, stripeEvent.data.object);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        await markEventProcessed(eventId, stripeEvent.type, stripeEvent.data.object);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        try {
          await syncSubscriptionStatus(subscription);
        } catch (error) {
          if (error instanceof DeferredBusinessApprovalError) {
            console.warn(`[webhook] deferring ${stripeEvent.type} ${eventId}: ${error.message}`);
            return {
              statusCode: 503,
              headers,
              body: JSON.stringify({
                received: false,
                retry: true,
                code: 'BUSINESS_APPROVAL_NOT_COMMITTED',
                businessId: error.businessId,
                status: error.status,
              }),
            };
          }
          throw error;
        }
        await markEventProcessed(eventId, stripeEvent.type, stripeEvent.data.object);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        await markEventProcessed(eventId, stripeEvent.type, stripeEvent.data.object);
        break;
      }

      case 'customer.subscription.trial_will_end': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        const businessId = subscription.metadata?.businessId;

        if (businessId) {
          const business = await prisma.businessProfile.findUnique({
            where: { id: businessId },
            include: {
              owner: {
                select: { email: true, name: true },
              },
            },
          });

          if (business?.owner?.email) {
            const daysLeft = 3; // Stripe sends this 3 days before trial ends
            await sendTrialEndingEmail(
              business.owner.email,
              business.name ?? '',
              daysLeft
            );
          }
        }
        await markEventProcessed(eventId, stripeEvent.type, stripeEvent.data.object);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        const customerId = typeof invoice.customer === 'string'
          ? invoice.customer
          : invoice.customer?.id;

        if (customerId) {
          const business = await prisma.businessProfile.findFirst({
            where: { stripeCustomerId: customerId },
          });

          if (business) {
            // BUG-036: the $0 invoice Stripe emits at trial start (a "Free
            // trial" invoice) must NOT flip a trialing subscription to
            // 'active' — that contradicts the contract mapping trialing→trial
            // and leaves a DB row saying active while Stripe says trialing.
            // Only real payments (> $0) transition to active; trial invoices
            // preserve whatever subscription.updated already synced.
            const isTrialInvoice = (invoice.total ?? 0) === 0;
            if (!isTrialInvoice) {
              await prisma.businessProfile.update({
                where: { id: business.id },
                data: { subscriptionStatus: 'active' },
              });
              console.log(`Payment succeeded for business ${business.id}, status set to active`);
            } else {
              console.log(`Trial invoice for business ${business.id} — status preserved`);
            }
          }
        }
        await markEventProcessed(eventId, stripeEvent.type, stripeEvent.data.object);
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
        // Still mark unhandled events as processed to avoid re-processing
        await markEventProcessed(eventId, stripeEvent.type, stripeEvent.data.object);
    }

    // Always return 200 to Stripe
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true }),
    };
  } catch (error: any) {
    console.error('Error in stripe-webhook:', error);
    // Always return 200 to avoid Stripe retries on our internal errors
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ received: true, warning: 'Internal error processed' }),
    };
  }
};
