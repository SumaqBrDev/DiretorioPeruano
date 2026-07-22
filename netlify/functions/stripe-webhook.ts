import prisma from './lib/prisma';
import Stripe from 'stripe';
import { sendPaymentFailedEmail, sendTrialEndingEmail } from './lib/email';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || '';

const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2025-03-01.basil',
});

/**
 * Map Stripe subscription status to our internal status
 */
function mapSubscriptionStatus(stripeStatus: string): string {
  switch (stripeStatus) {
    case 'trialing':
      return 'trial';
    case 'active':
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

/**
 * Sync subscription status to database
 */
async function syncSubscriptionStatus(subscription: Stripe.Subscription): Promise<void> {
  const businessId = subscription.metadata?.businessId;
  if (!businessId) {
    console.warn('No businessId in subscription metadata, skipping sync');
    // Try to find by customer ID
    const customerId = typeof subscription.customer === 'string'
      ? subscription.customer
      : subscription.customer?.id;

    if (customerId) {
      const business = await prisma.businessProfile.findFirst({
        where: { stripeCustomerId: customerId },
      });
      if (business) {
        const newStatus = mapSubscriptionStatus(subscription.status);
        await prisma.businessProfile.update({
          where: { id: business.id },
          data: {
            subscriptionStatus: newStatus,
            trialEndsAt: subscription.trial_end
              ? new Date(subscription.trial_end * 1000)
              : undefined,
          },
        });
        console.log(`Synced subscription ${subscription.id} for business ${business.id}: ${newStatus}`);
      }
    }
    return;
  }

  const newStatus = mapSubscriptionStatus(subscription.status);

  await prisma.businessProfile.update({
    where: { id: businessId },
    data: {
      subscriptionStatus: newStatus,
      trialEndsAt: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : undefined,
    },
  });

  console.log(`Synced subscription ${subscription.id} for business ${businessId}: ${newStatus}`);
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
    await sendPaymentFailedEmail(business.owner.email, business.name);
  }
}

/**
 * Handle subscription deleted
 */
async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const businessId = subscription.metadata?.businessId;
  const customerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id;

  const whereClause = businessId
    ? { id: businessId }
    : { stripeCustomerId: customerId || '' };

  const business = await prisma.businessProfile.findFirst({
    where: whereClause,
    select: { id: true, name: true },
  });

  if (!business) {
    console.warn('No business found for deleted subscription');
    return;
  }

  await prisma.businessProfile.update({
    where: { id: business.id },
    data: {
      subscriptionStatus: 'canceled',
      stripeSubscriptionId: null,
    },
  });

  console.log(`Business ${business.id} subscription canceled`);
}

export const handler = async (event: any) => {
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

    if (!STRIPE_WEBHOOK_SECRET) {
      console.warn('STRIPE_WEBHOOK_SECRET not configured, skipping signature verification');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Webhook secret not configured' }),
      };
    }

    let stripeEvent: Stripe.Event;

    try {
      stripeEvent = stripe.webhooks.constructEvent(rawBody, sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: any) {
      console.error('Stripe signature verification failed:', err.message);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid signature' }),
      };
    }

    // Handle specific event types
    switch (stripeEvent.type) {
      case 'invoice.payment_failed': {
        const invoice = stripeEvent.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await syncSubscriptionStatus(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = stripeEvent.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
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
              business.name,
              daysLeft
            );
          }
        }
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
            await prisma.businessProfile.update({
              where: { id: business.id },
              data: { subscriptionStatus: 'active' },
            });
            console.log(`Payment succeeded for business ${business.id}, status set to active`);
          }
        }
        break;
      }

      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
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
