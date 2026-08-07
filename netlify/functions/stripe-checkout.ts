import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { requireBusinessOwner } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const STRIPE_PRICE_ID = process.env.STRIPE_PRICE_ID || 'price_59_brl_monthly';
const STRIPE_TRIAL_DAYS = parseInt(process.env.STRIPE_TRIAL_DAYS || '30', 10);

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
    const { businessId, plan = 'monthly' } = body;

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId requerido' }),
      };
    }

    // Authenticate the request AND verify the logged-in user owns this business.
    const auth = await requireBusinessOwner(event, businessId);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    // Fetch the business with owner contact info
    const business = await prisma.businessProfile.findUnique({
      where: { id: businessId },
      include: {
        owner: { select: { id: true, email: true, name: true } },
      },
    });

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Negocio no encontrado' }),
      };
    }

    if (!business.owner) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Negocio sin propietario registrado' }),
      };
    }

    if (business.status !== 'approved') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'El negocio debe estar aprobado para activar la suscripción.',
        }),
      };
    }

    // Beta mode: no charges, still return a valid "checkout not needed" response
    const siteConfig = await prisma.siteConfig.findUnique({
      where: { id: 'singleton' },
    });
    const betaMode = siteConfig?.betaMode ?? true;

    if (betaMode) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          url: '',
          betaMode: true,
          message: 'Modo beta activo: no se requiere checkout. Suscripción de prueba otorgada.',
          trialEndsAt: new Date(Date.now() + STRIPE_TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString(),
        }),
      };
    }

    // Resolve price id for the requested plan
    const priceId =
      plan === 'monthly' ? STRIPE_PRICE_ID : process.env.STRIPE_PRICE_ID_YEARLY || STRIPE_PRICE_ID;

    // Create Stripe customer if the business doesn't have one yet
    let customerId = business.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: business.owner.email ?? undefined,
        name: business.name ?? undefined,
        metadata: {
          businessId: business.id,
          ownerId: business.ownerId,
        },
      });
      customerId = customer.id;
      await prisma.businessProfile.update({
        where: { id: business.id },
        data: { stripeCustomerId: customerId },
      });
    }

    // Create Checkout session for a subscription with a 30-day trial
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: STRIPE_TRIAL_DAYS,
        metadata: { businessId: business.id },
      },
      metadata: { businessId: business.id },
      success_url: `${event.headers?.origin || process.env.APP_URL || 'https://conectaperu.com'}/meu-negocio?checkout=success`,
      cancel_url: `${event.headers?.origin || process.env.APP_URL || 'https://conectaperu.com'}/meu-negocio?checkout=cancel`,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url, betaMode: false }),
    };
  } catch (error: any) {
    console.error('Error in stripe-checkout:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al crear el checkout', details: error.message }),
    };
  }
};
