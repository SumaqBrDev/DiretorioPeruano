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

export const handler = async (event: any) => {
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
      },
    });

    const activeAds = allAds.filter(
      (ad) => ad.status === 'active' && ad.startsAt && ad.endsAt && ad.startsAt <= now && ad.endsAt > now
    );

    // Revenue: subscriptions counted as monthly base (active × plan price);
    // ads as the one-time purchase price per ad ever paid for (active + pending
    // with a stripe session + expired are all paid; cancelled are not).
    const paidAds = allAds.filter((ad) => ad.status !== 'cancelled');
    const subRevenueCents = activeSubs.length * SUB_PRICE_CENTS;
    const adRevenueCents = paidAds.length * AD_PRICE_CENTS;
    const totalRevenueCents = subRevenueCents + adRevenueCents;

    const fmtAds = allAds.map((ad) => ({
      id: ad.id,
      businessId: ad.businessId,
      businessName: ad.business?.name || '—',
      title: ad.title,
      status: ad.status,
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
