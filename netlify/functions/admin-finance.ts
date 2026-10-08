import type { HandlerEvent } from '@netlify/functions';
// netlify/functions/admin-finance.ts
// Financial dashboard for the superadmin: revenue breakdown (subscriptions
// vs one-time ads) plus detailed tables of active subscriptions and paid ads.
// GET only, superadmin role required (server-side via requireSuperAdmin).
import prisma from './lib/prisma';
import { requireSuperAdmin } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const SUB_PRICE_CENTS = parseInt(process.env.SUB_PRICE_CENTS || '5900', 10); // R$59/mes
const AD_PRICE_CENTS = parseInt(process.env.AD_PRICE_CENTS || '3000', 10); // R$30

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const auth = await requireSuperAdmin(event);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  try {
    const now = new Date();

    // ── Active subscriptions (recurring revenue base) ──
    const activeSubs = await prisma.businessProfile.findMany({
      where: { subscriptionStatus: 'active' },
      orderBy: { updatedAt: 'desc' },
      select: {
        id: true,
        name: true,
        status: true,
        subscriptionId: true,
        subscriptionStatus: true,
        trialEndsAt: true,
        approvedAt: true,
        createdAt: true,
        updatedAt: true,
        owner: { select: { email: true, name: true } },
      },
    });

    // ── Paid ads (one-time revenue) ──
    const allAds = await prisma.businessAd.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        business: {
          select: { id: true, name: true },
        },
        // Community ads have no business, so the purchaser supplies the name.
        user: { select: { name: true } },
      },
    });

    const activeAds = allAds.filter(
      (ad) => ad.status === 'active' && ad.startsAt && ad.endsAt && ad.startsAt <= now && ad.endsAt > now
    );

    // Revenue: subscriptions counted as monthly base (active × plan price);
    // ads as the one-time purchase price per ad ACTUALLY paid and not refunded.
    //
    // An ad counts as revenue only if money really arrived and stayed:
    //  - it has a Stripe payment (beta ads are free, drafts never charged),
    //  - it is past the payment step (not 'draft'/'pending_payment'),
    //  - it was not refunded (a third-strike rejection returns the money).
    // The previous rule was `status !== 'cancelled'`, which counted drafts,
    // unpaid ads and refunded ones as income — reporting revenue that does
    // not exist is worse than reporting none.
    const NON_REVENUE_STATUSES = new Set([
      'draft',
      'pending_payment',
      'cancelled',
      'rejected_final',
    ]);
    const paidAds = allAds.filter(
      (ad) =>
        Boolean(ad.stripePaymentId) &&
        !NON_REVENUE_STATUSES.has(ad.status) &&
        ad.refundedAt === null
    );
    const subRevenueCents = activeSubs.length * SUB_PRICE_CENTS;
    const adRevenueCents = paidAds.length * AD_PRICE_CENTS;
    const totalRevenueCents = subRevenueCents + adRevenueCents;

    const fmtAds = allAds.map((ad) => ({
      id: ad.id,
      businessId: ad.businessId,
      // Community ads have no business; fall back to the purchaser's name.
      businessName: ad.business?.name || ad.user?.name || 'Anunciante da comunidade',
      title: ad.title,
      status: ad.status,
      moderationReason: ad.moderationReason || null,
      reviewAttempts: ad.reviewAttempts ?? 0,
      refundedAt: ad.refundedAt?.toISOString() || null,
      startsAt: ad.startsAt?.toISOString() || null,
      endsAt: ad.endsAt?.toISOString() || null,
      createdAt: ad.createdAt.toISOString(),
      stripePaymentId: ad.stripePaymentId || null,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        summary: {
          activeSubscriptions: activeSubs.length,
          activeAds: activeAds.length,
          totalAdsPaid: paidAds.length,
          subRevenueCents,
          adRevenueCents,
          totalRevenueCents,
          currency: process.env.AD_CURRENCY || 'brl',
          subPriceCents: SUB_PRICE_CENTS,
          adPriceCents: AD_PRICE_CENTS,
        },
        subscriptions: activeSubs.map((b) => ({
          businessId: b.id,
          businessName: b.name || '—',
          status: b.status,
          subscriptionId: b.subscriptionId || null,
          subscriptionStatus: b.subscriptionStatus,
          trialEndsAt: b.trialEndsAt?.toISOString() || null,
          approvedAt: b.approvedAt?.toISOString() || null,
          createdAt: b.createdAt.toISOString(),
          updatedAt: b.updatedAt.toISOString(),
          ownerEmail: b.owner?.email || null,
          ownerName: b.owner?.name || null,
        })),
        ads: fmtAds,
      }),
    };
  } catch (error) {
    console.error('Error in admin-finance:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to load financial data' }),
    };
  }
};
