import type { HandlerEvent } from '@netlify/functions';
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
// Currency of the subscription price charged after approval (R$59/month).
// Setup-mode Checkout has no price to infer it from, so it must be passed
// explicitly and kept in sync with the configured Stripe price.
const SUBSCRIPTION_CURRENCY = (process.env.STRIPE_CURRENCY || 'brl').toLowerCase();

const stripe = getStripe();

export const handler = async (event: HandlerEvent) => {
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

    // Checkout only collects and saves a payment method. The paid subscription
    // is created later, atomically with admin approval, so pending businesses
    // are never charged and never start their 30-day trial early.
    if (business.status === 'rejected' || business.status === 'disabled') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Este negócio não pode ativar uma assinatura no estado atual.',
          code: 'BUSINESS_NOT_ELIGIBLE',
        }),
      };
    }

    if (business.subscriptionId) {
      return {
        statusCode: 409,
        headers,
        body: JSON.stringify({
          error: 'Este negocio ya tiene una suscripción registrada.',
          code: 'SUBSCRIPTION_ALREADY_EXISTS',
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

    // Resolve price id for the requested plan.
    //
    // A `||` fallback only covers an EMPTY variable: a present-but-invalid id
    // passes straight through. Setup mode never validates the price, so the
    // card would be saved for a price that does not exist and approval would
    // fail later with "No such price". Validate the price up front instead.
    const configuredYearlyPriceId = process.env.STRIPE_PRICE_ID_YEARLY || '';
    const priceId = plan === 'monthly' ? STRIPE_PRICE_ID : configuredYearlyPriceId || STRIPE_PRICE_ID;

    try {
      const price = await stripe.prices.retrieve(priceId);
      if (price.active === false) {
        throw new Error(`Price ${priceId} is not active`);
      }
    } catch (priceError: any) {
      console.error('Configured price unusable:', priceId, priceError?.message);
      return {
        statusCode: 503,
        headers,
        body: JSON.stringify({
          error:
            'Este plano está temporariamente indisponível. Sua solicitação foi salva; tente novamente pelo painel Meu Negócio ou escolha o plano mensal.',
          code: 'PLAN_UNAVAILABLE',
          developer_details: priceError?.message,
        }),
      };
    }

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

    // Create Checkout session in setup mode only: collect and save a payment
    // method without creating a subscription or charging while pending.
    //
    // `currency` is REQUIRED in setup mode: Stripe has no price to infer it
    // from, and omitting it fails with 400 parameter_missing (param: currency).
    // It must match the subscription price created on approval, otherwise the
    // saved payment method may not be usable for that currency.
    const session = await stripe.checkout.sessions.create({
      mode: 'setup',
      customer: customerId,
      currency: SUBSCRIPTION_CURRENCY,
      metadata: { businessId: business.id, plan, priceId },
      setup_intent_data: {
        metadata: { businessId: business.id, plan, priceId },
      },
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
    // The business row is already created and pending at this point, so a
    // checkout failure must NOT read as "saving failed". Report it as a
    // retryable payment-setup problem and keep the request intact.
    return {
      statusCode: 502,
      headers,
      body: JSON.stringify({
        error:
          'Sua solicitação foi salva e está pendente de aprovação. Não conseguimos abrir o checkout para salvar o método de pagamento agora; tente novamente pelo painel Meu Negócio.',
        code: 'PAYMENT_SETUP_UNAVAILABLE',
        details: error.message,
      }),
    };
  }
};
