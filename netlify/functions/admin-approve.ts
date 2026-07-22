import prisma from './lib/prisma';
import Stripe from 'stripe';
import { sendApprovalEmail } from './lib/email';

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
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

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

    const body = JSON.parse(event.body || '{}');
    const { businessId } = body;

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId requerido' }),
      };
    }

    // Fetch the business
    const business = await prisma.businessProfile.findUnique({
      where: { id: businessId },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Negocio no encontrado' }),
      };
    }

    if (business.status === 'approved') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'El negocio ya está aprobado' }),
      };
    }

    // Check if beta mode is enabled
    const siteConfig = await prisma.siteConfig.findUnique({
      where: { id: 'singleton' },
    });
    const betaMode = siteConfig?.betaMode ?? true;

    let stripeCustomerId = business.stripeCustomerId;
    let stripeSubscriptionId = business.stripeSubscriptionId;
    let trialEndsAt: Date | null = null;

    // Only create Stripe customer + subscription if NOT in beta mode
    if (!betaMode) {
      try {
        const stripe = getStripe();

        // Create Stripe Customer if not exists
        if (!stripeCustomerId) {
          const customer = await stripe.customers.create({
            email: business.owner.email,
            name: business.name,
            metadata: {
              businessId: business.id,
              ownerId: business.ownerId,
            },
          });
          stripeCustomerId = customer.id;
        }

        // Create Stripe Subscription with 30-day trial
        const subscription = await stripe.subscriptions.create({
          customer: stripeCustomerId,
          items: [{ price: STRIPE_PRICE_ID }],
          trial_period_days: STRIPE_TRIAL_DAYS,
          metadata: {
            businessId: business.id,
          },
          payment_behavior: 'default_incomplete',
          payment_settings: {
            save_default_payment_method: 'on_subscription',
          },
        });

        stripeSubscriptionId = subscription.id;

        // Calculate trial end date
        trialEndsAt = new Date();
        trialEndsAt.setDate(trialEndsAt.getDate() + STRIPE_TRIAL_DAYS);
      } catch (stripeError: any) {
        console.error('Stripe error during approval:', stripeError);
        // Continue with approval even if Stripe fails
        // Business gets approved but without subscription
      }
    }

    // Update business status
    const now = new Date();
    const updatedBusiness = await prisma.businessProfile.update({
      where: { id: businessId },
      data: {
        status: 'approved',
        approvedAt: now,
        subscriptionStatus: betaMode ? 'none' : 'trial',
        ...(stripeCustomerId ? { stripeCustomerId } : {}),
        ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
        ...(trialEndsAt ? { trialEndsAt } : {}),
      },
      include: {
        owner: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    // Send approval email
    const ownerEmail = business.owner.email;
    const ownerName = business.owner.name || business.ownerFullName || 'Usuario';
    const formattedTrialEnd = trialEndsAt
      ? trialEndsAt.toLocaleDateString('es-PE', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })
      : betaMode
        ? 'No aplica (modo beta)'
        : '30 días desde ahora';

    await sendApprovalEmail(ownerEmail, business.name, ownerName, formattedTrialEnd);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        business: {
          id: updatedBusiness.id,
          name: updatedBusiness.name,
          status: updatedBusiness.status,
          approvedAt: updatedBusiness.approvedAt,
          subscriptionStatus: updatedBusiness.subscriptionStatus,
          stripeCustomerId: updatedBusiness.stripeCustomerId,
          stripeSubscriptionId: updatedBusiness.stripeSubscriptionId,
          trialEndsAt: updatedBusiness.trialEndsAt,
        },
        subscription: stripeSubscriptionId
          ? {
              id: stripeSubscriptionId,
              customerId: stripeCustomerId,
              trialEndsAt: trialEndsAt,
              priceId: STRIPE_PRICE_ID,
            }
          : null,
      }),
    };
  } catch (error: any) {
    console.error('Error in admin-approve:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al aprobar negocio', details: error.message }),
    };
  }
};
