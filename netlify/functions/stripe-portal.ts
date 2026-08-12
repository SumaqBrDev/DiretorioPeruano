import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { requireBusinessOwner, requireSuperAdmin } from './lib/auth';
import type Stripe from 'stripe';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const stripe = getStripe();

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { businessId } = body;

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId requerido' }),
      };
    }

    // Auth guard: require business owner OR superadmin
    const ownerAuth = await requireBusinessOwner(event, businessId);
    if (!ownerAuth.ok) {
      // If not the owner, check if superadmin
      const adminAuth = await requireSuperAdmin(event);
      if (!adminAuth.ok) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Acceso denegado — debe ser propietario del negocio o superadmin.' }),
        };
      }
    }

    // Fetch the business to get the Stripe customer ID
    const business = await prisma.businessProfile.findUnique({
      where: { id: businessId },
      select: {
        id: true,
        stripeCustomerId: true,
        subscriptionId: true,
        name: true,
      },
    });

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Negocio no encontrado' }),
      };
    }

    if (!business.stripeCustomerId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Este negocio no tiene un cliente Stripe asociado. Debe ser aprobado primero para generar la suscripción.',
        }),
      };
    }

    // Create Stripe Billing Portal session.
    // flow_data.subscription_cancel REQUIRES a real subscription id — passing
    // null (trial granted in beta mode, or sub not yet created) makes Stripe
    // reject the request with a 400 and we surface a misleading 500. Fall back
    // to a plain portal session (no pre-filled cancel flow) when absent.
    const sessionParams: Stripe.BillingPortal.SessionCreateParams = {
      customer: business.stripeCustomerId,
      return_url: `${event.headers?.origin || process.env.APP_URL || 'https://conectaperu.com'}/meu-negocio`,
    };
    if (business.subscriptionId) {
      sessionParams.flow_data = {
        type: 'subscription_cancel',
        subscription_cancel: {
          subscription: business.subscriptionId,
        },
      };
    }
    const session = await stripe.billingPortal.sessions.create(sessionParams);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error: any) {
    console.error('Error in stripe-portal:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al crear portal de facturación' }),
    };
  }
};
