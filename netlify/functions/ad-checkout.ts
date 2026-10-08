// netlify/functions/ad-checkout.ts
// Paid ad checkout: one-time R$30 for 30 days.
//
// Who may advertise: ANY confirmed account (verified email) — a business owner
// OR a community member. Ads are a complementary product the user buys, NOT a
// benefit of the monthly subscription, so subscription status is never read.
// (The previous version required `subscriptionStatus === 'active'`, which in
// beta left every account at 'none', making ads impossible to buy at all.)
//
// Flow: accept the publication terms → pay → `pending_review` → moderation
// approves (publishes) or rejects (correctable, up to 3 attempts).
// Beta mode: no Stripe, but the ad STILL goes through moderation — beta
// relaxes billing, never content review.
import prisma from './lib/prisma';
import { getStripe } from './lib/stripe';
import { authenticateRequest, fetchClerkUserProfile } from './lib/auth';
import { canUserAdvertise, buildAdPublicationTerms } from './lib/adModeration';
import type { HandlerEvent } from '@netlify/functions';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const AD_PRICE_CENTS = parseInt(process.env.AD_PRICE_CENTS || '3000', 10); // R$30.00
const AD_CURRENCY = process.env.AD_CURRENCY || 'brl';
const AD_PRODUCT_NAME = process.env.AD_PRODUCT_NAME || 'Anúncio ConectaPeru (30 dias)';

/** Human-readable reason for an eligibility rejection. */
const ELIGIBILITY_MESSAGES: Record<string, string> = {
  email_not_verified:
    'Confirme seu e-mail antes de anunciar. Acesse Minha conta para concluir a verificação.',
  business_disabled:
    'Seu negócio está inabilitado. Anúncios não estão disponíveis enquanto essa situação não for resolvida.',
};

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
    const { businessId, title, imageUrl, targetUrl, acceptedTermsVersion, saveAsDraft } = body;

    if (!title || !String(title).trim()) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'O título do anúncio é obrigatório.' }),
      };
    }

    const auth = await authenticateRequest(event);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode ?? 401,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: auth.clerkId },
      include: {
        business: { select: { id: true, status: true, stripeCustomerId: true } },
      },
    });

    if (!user) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Usuário não encontrado.' }),
      };
    }

    // Email verification is the eligibility floor. The session token carries
    // only `sub`, so the verification state must come from the Clerk API.
    const profile = await fetchClerkUserProfile(auth.clerkId!);
    const eligibility = canUserAdvertise({
      hasVerifiedEmail: profile?.emailVerified === true,
      business: user.business,
    });

    if (!eligibility.allowed) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({
          error: ELIGIBILITY_MESSAGES[eligibility.reason],
          reason: eligibility.reason,
        }),
      };
    }

    // A business ad may only be bought by that business's owner: `businessId`
    // arrives from the client and must never be trusted on its own.
    let ownedBusinessId: string | null = null;
    if (businessId) {
      if (!user.business || user.business.id !== businessId) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Você não é o proprietário deste negócio.' }),
        };
      }
      ownedBusinessId = user.business.id;
    }

    const adFields = {
      businessId: ownedBusinessId,
      userId: user.id,
      title: String(title).trim().slice(0, 120),
      imageUrl: imageUrl?.trim() || null,
      targetUrl: targetUrl?.trim() || null,
    };

    // Draft: configured but not submitted. No payment, no review, and the
    // terms are not recorded because nothing was committed to yet.
    if (saveAsDraft) {
      const draft = await prisma.businessAd.create({
        data: { ...adFields, status: 'draft' },
        select: { id: true },
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ adId: draft.id, status: 'draft' }),
      };
    }

    // Submitting for publication requires accepting the current terms, and the
    // accepted version is stored so a later dispute can be answered with the
    // exact text the advertiser was shown.
    const terms = buildAdPublicationTerms();
    if (acceptedTermsVersion !== terms.version) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'É necessário aceitar as Normas de Publicação de Anúncios para continuar.',
          requiredTermsVersion: terms.version,
        }),
      };
    }

    const termsFields = { termsVersion: terms.version, termsAcceptedAt: new Date() };

    const siteConfig = await prisma.siteConfig.findUnique({ where: { id: 'singleton' } });
    const betaMode = siteConfig?.betaMode ?? true;

    // Beta: skip billing, but STILL require moderation. Beta relaxes payment,
    // never content review — an unreviewed ad could publish anything.
    if (betaMode) {
      const ad = await prisma.businessAd.create({
        data: { ...adFields, ...termsFields, status: 'pending_review' },
        select: { id: true },
      });
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          adId: ad.id,
          url: '',
          betaMode: true,
          status: 'pending_review',
          message:
            'Modo beta: anúncio enviado para análise sem cobrança. Será publicado após aprovação da moderação.',
        }),
      };
    }

    const ad = await prisma.businessAd.create({
      data: { ...adFields, ...termsFields, status: 'pending_payment' },
      select: { id: true },
    });

    const origin =
      event.headers?.origin || process.env.APP_URL || 'https://conectaperu.netlify.app';
    const returnPath = ownedBusinessId ? '/meu-negocio' : '/comunidad';

    const session = await getStripe().checkout.sessions.create({
      mode: 'payment',
      customer: user.business?.stripeCustomerId || undefined,
      customer_email: user.business?.stripeCustomerId ? undefined : profile?.email || undefined,
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
      metadata: { adId: ad.id, businessId: ownedBusinessId ?? '', userId: user.id },
      success_url: `${origin}${returnPath}?ad=success`,
      cancel_url: `${origin}${returnPath}?ad=cancel`,
    });

    // Persist the session id so the webhook can find the exact ad.
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
        status: 'pending_payment',
      }),
    };
  } catch (error: any) {
    console.error('Error in ad-checkout:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao criar o anúncio', details: error.message }),
    };
  }
};
