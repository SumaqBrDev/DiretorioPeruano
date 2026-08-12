import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { requireBusinessOwner, requireSuperAdmin } from './lib/auth';

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

    // Create Stripe Billing Portal session — NO flow_data.
    //
    // flow_data.subscription_cancel fails with a 400 whenever the subscription
    // is already set to cancel at period end ("already set to be canceled"),
    // and also when there's no real subscriptionId (beta trial). The portal
    // itself already shows the subscription with manage/cancel actions, so we
    // skip the pre-filled cancel flow entirely — this removes the whole class
    // of state-dependent errors.
    const session = await stripe.billingPortal.sessions.create({
      customer: business.stripeCustomerId,
      return_url: `${event.headers?.origin || process.env.APP_URL || 'https://conectaperu.com'}/meu-negocio`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error: any) {
    // Surface the REAL Stripe message — the generic text hides the cause and
    // makes QA look like a black box. Distinguish Stripe API errors (client's
    // fault, 4xx) from unexpected failures (5xx).
    const stripeMsg: string =
      error?.type === 'StripeInvalidRequestError' || error?.raw?.message
        ? (error?.message || error?.raw?.message || 'Stripe error')
        : 'Error al crear portal de facturación';
    console.error('Error in stripe-portal:', error?.message || error);
    return {
      statusCode: error?.statusCode || 500,
      headers,
      body: JSON.stringify({ error: stripeMsg }),
    };
  }
};
