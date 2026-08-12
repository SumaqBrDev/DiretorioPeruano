// netlify/functions/ad-checkout.ts
// Paid community ad checkout (Opción A+B): one-time R$30 for 30 days.
// Only businesses APPROVED and with an ACTIVE subscription may purchase.
// Flow: create a BusinessAd row (status pending) → Stripe Checkout Session
// (mode=payment) → webhook checkout.session.completed activates it
// (status active, endsAt = now + AD_DAYS).
// Beta mode: no Stripe — the ad is activated immediately (trial grant).
import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { requireBusinessOwner } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const AD_PRICE_CENTS = parseInt(process.env.AD_PRICE_CENTS || '3000', 10); // R$30.00
const AD_DAYS = parseInt(process.env.AD_DAYS || '30', 10);
const AD_CURRENCY = process.env.AD_CURRENCY || 'brl';
const AD_PRODUCT_NAME = process.env.AD_PRODUCT_NAME || 'Anúncio ConectaPeru (30 dias)';

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
    const { businessId, title, imageUrl, targetUrl } = body;

    if (!businessId || !title || !title.trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId y título del anuncio son requeridos' }),
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

    const business = await prisma.businessProfile.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, status: true, subscriptionStatus: true },
    });

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Negocio no encontrado' }),
      };
    }

    if (business.status !== 'approved') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'El negocio debe estar aprobado para publicar anuncios.',
        }),
      };
    }

    // Rule: ONLY businesses with an active subscription can buy ads.
    if (business.subscriptionStatus !== 'active') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: 'Solo negocios con suscripción activa pueden publicar anuncios.',
        }),
      };
    }

    // Beta mode: grant the ad immediately, no Stripe.
    const siteConfig = await prisma.siteConfig.findUnique({
      where: { id: 'singleton' },
    });
    const betaMode = siteConfig?.betaMode ?? true;

    if (betaMode) {
      const now = new Date();
      const endsAt = new Date(now.getTime() + AD_DAYS * 24 * 60 * 60 * 1000);
      const ad = await prisma.businessAd.create({
        data: {
          businessId,
          title: title.trim().slice(0, 120),
          imageUrl: imageUrl?.trim() || null,
          targetUrl: targetUrl?.trim() || null,
          status: 'active',
          startsAt: now,
          endsAt,
        },
        select: { id: true, endsAt: true },
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          adId: ad.id,
          url: '',
          betaMode: true,
          message: `Modo beta activo: anuncio de prueba activado por ${AD_DAYS} días.`,
          endsAt: ad.endsAt.toISOString(),
        }),
      };
    }

    // Create the ad row in pending state; webhook activates it on payment.
    const ad = await prisma.businessAd.create({
      data: {
        businessId,
        title: title.trim().slice(0, 120),
        imageUrl: imageUrl?.trim() || null,
        targetUrl: targetUrl?.trim() || null,
        status: 'pending',
      },
      select: { id: true },
    });

    // Checkout Session (one-time payment, no subscription) — same UX as
    // stripe-checkout: Stripe hosts the payment page, user is redirected back.
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer: business.stripeCustomerId || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: AD_CURRENCY,
            unit_amount: AD_PRICE_CENTS,
            product_data: { name: AD_PRODUCT_NAME },
          },
        },
      ],
      metadata: { adId: ad.id, businessId: business.id },
      success_url: `${event.headers?.origin || process.env.APP_URL || 'https://conectaperu.com'}/meu-negocio?ad=success`,
      cancel_url: `${event.headers?.origin || process.env.APP_URL || 'https://conectaperu.com'}/meu-negocio?ad=cancel`,
    });

    // Persist the session id so the webhook can activate the exact ad.
    await prisma.businessAd.update({
      where: { id: ad.id },
      data: { stripePaymentId: session.id },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        adId: ad.id,
        url: session.url,
        betaMode: false,
      }),
    };
  } catch (error: any) {
    console.error('Error in ad-checkout:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al crear el anuncio', details: error.message }),
    };
  }
};
