import prisma from './lib/prisma';
import Stripe from 'stripe';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || '';
const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_59_brl_monthly';
const STRIPE_TRIAL_DAYS = parseInt(process.env.STRIPE_TRIAL_DAYS || '30', 10);

let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    stripeInstance = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: '2025-03-01.basil',
    });
  }
  return stripeInstance;
}

async function verifySuperAdmin(clerkId: string): Promise<boolean> {
  if (!clerkId) return false;
  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });
  return user?.role === 'superadmin';
}

export const handler = async (event: any) => {
  try {
    // Verify superadmin
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado — token requerido' }),
      };
    }

    const isSuperAdmin = await verifySuperAdmin(token);
    if (!isSuperAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acceso denegado — se requiere rol superadmin' }),
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

      // If disabling beta mode: set trialEndsAt = now + 30d for all approved businesses
      // that don't already have a subscription
      if (!betaMode) {
        const now = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + STRIPE_TRIAL_DAYS);

        // Get all approved businesses without Stripe subscription
        const approvedBusinesses = await prisma.businessProfile.findMany({
          where: {
            status: 'approved',
            stripeSubscriptionId: null,
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
            const stripe = getStripe();

            // Create Stripe customer
            const customer = await stripe.customers.create({
              email: biz.owner.email,
              name: biz.name,
              metadata: {
                businessId: biz.id,
                ownerId: biz.ownerId,
              },
            });

            // Create subscription with trial
            const subscription = await stripe.subscriptions.create({
              customer: customer.id,
              items: [{ price: STRIPE_PRICE_ID }],
              trial_period_days: STRIPE_TRIAL_DAYS,
              metadata: {
                businessId: biz.id,
              },
              payment_behavior: 'default_incomplete',
              payment_settings: {
                save_default_payment_method: 'on_subscription',
              },
            });

            // Update business with Stripe info and trial end date
            await prisma.businessProfile.update({
              where: { id: biz.id },
              data: {
                stripeCustomerId: customer.id,
                stripeSubscriptionId: subscription.id,
                subscriptionStatus: 'trial',
                trialEndsAt: trialEnd,
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
