import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { requireSuperAdmin } from './lib/auth';
import { buildBetaExitSubscriptionParams, resolveBetaExitStatus } from './lib/betaExitBilling';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_59_brl_monthly';
const STRIPE_TRIAL_DAYS = parseInt(process.env.STRIPE_TRIAL_DAYS || '30', 10);
// Early-bird launch offer, granted to businesses that joined during the beta.
const getEarlyBirdCouponId = () => process.env.EARLY_BIRD_COUPON_ID || '';

export const handler = async (event: HandlerEvent) => {
  try {
    // Verify superadmin: validate Clerk token + superadmin role in PostgreSQL
    const auth = await requireSuperAdmin(event);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    // GET — Read current beta mode
    if (event.httpMethod === 'GET') {
      const siteConfig = await prisma.siteConfig.findUnique({
        where: { id: 'singleton' },
      });
      const betaMode = siteConfig?.betaMode ?? true;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ betaMode }),
      };
    }

    // POST — Update beta mode
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { betaMode } = body;

      if (typeof betaMode !== 'boolean') {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'betaMode debe ser booleano (true/false)' }),
        };
      }

      // Update SiteConfig
      await prisma.siteConfig.upsert({
        where: { id: 'singleton' },
        update: { betaMode },
        create: { id: 'singleton', betaMode },
      });

      // Leaving beta: businesses that joined DURING the beta are early
      // adopters. They move onto the normal subscription with the early-bird
      // coupon applied — not onto another free trial (see lib/betaExitBilling).
      if (!betaMode) {
        // Get all approved businesses without Stripe subscription
        const approvedBusinesses = await prisma.businessProfile.findMany({
          where: {
            status: 'approved',
            subscriptionId: null,
          },
          include: {
            owner: {
              select: { email: true, name: true },
            },
          },
        });

        // For each business, create Stripe customer + subscription with trial
        for (const biz of approvedBusinesses) {
          try {
            if (!biz.owner) {
              console.warn(`Business ${biz.id} has no owner — skipping Stripe provisioning`);
              continue;
            }

            const stripe = getStripe();

            // Create Stripe customer
            const customer = await stripe.customers.create({
              email: biz.owner.email ?? undefined,
              name: biz.name ?? undefined,
              metadata: {
                businessId: biz.id,
                ownerId: biz.ownerId,
              },
            });

            // Beta adopters get the early-bird coupon and start billing now;
            // they must NOT receive a second free trial (see betaExitBilling).
            const subscription = await stripe.subscriptions.create(
              buildBetaExitSubscriptionParams({
                customerId: customer.id,
                businessId: biz.id,
                priceId: STRIPE_PRICE_ID,
                couponId: getEarlyBirdCouponId(),
                trialDays: STRIPE_TRIAL_DAYS,
              }) as never
            );

            // Update business with Stripe info. trialEndsAt stays null: this
            // business is being billed, not trialling.
            await prisma.businessProfile.update({
              where: { id: biz.id },
              data: {
                stripeCustomerId: customer.id,
                subscriptionId: subscription.id,
                subscriptionStatus: resolveBetaExitStatus({
                  hasCoupon: Boolean(getEarlyBirdCouponId()),
                }),
                trialEndsAt: null,
              },
            });

            console.log(`Created Stripe subscription for business ${biz.id} after beta mode off`);
          } catch (stripeError: any) {
            console.error(`Error creating subscription for business ${biz.id}:`, stripeError);
            // Continue with next business
          }
        }
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          betaMode,
          message: betaMode
            ? 'Modo beta activado. Los nuevos negocios aprobados no requerirán Stripe.'
            : 'Modo beta desactivado. Stripe subscriptions creadas para negocios aprobados.',
        }),
      };
    }

    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'GET, POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  } catch (error: any) {
    console.error('Error in admin-beta-mode:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al gestionar modo beta', details: error.message }),
    };
  }
};
