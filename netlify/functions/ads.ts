// netlify/functions/ads.ts
// Public read endpoint: active paid ads for the Comunidad section.
// Opción A (sidebar 300x250) + Opción B (featured card) both consume this.
// Ordering: soonest-expiring first → fair rotation, no manual curation.
import { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { resolveAdDisplayIdentity } from './lib/adModeration';

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: {
        'Content-Type': 'application/json',
        'Allow': 'GET',
      },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const now = new Date();
    const ads = await prisma.businessAd.findMany({
      where: {
        status: 'active',
        startsAt: { lte: now },
        endsAt: { gt: now },
        // Business ads require an approved listing; community ads have no
        // business at all. Without the OR, every community ad would be
        // filtered out by the business constraint.
        OR: [
          { business: { status: 'approved' } },
          { businessId: null },
        ],
      },
      orderBy: { endsAt: 'asc' },
      take: 6,
      include: {
        business: {
          select: {
            id: true,
            name: true,
            category: true,
            photos: true,
            rating: true,
          },
        },
        user: { select: { name: true } },
      },
    });

    const result = ads.map((ad) => {
      const identity = resolveAdDisplayIdentity({
        business: ad.business,
        user: ad.user,
        ad: { imageUrl: ad.imageUrl, targetUrl: ad.targetUrl },
      });
      return {
        id: ad.id,
        businessId: ad.businessId,
        businessName: identity.displayName,
        category: identity.category,
        // null, not 0: a community advertiser has no rating, and 0 would
        // render as a real zero-star score.
        rating: identity.rating,
        title: ad.title,
        imageUrl: identity.imageUrl,
        targetUrl: identity.targetUrl,
        startsAt: ad.startsAt?.toISOString() || null,
        endsAt: ad.endsAt?.toISOString() || null,
      };
    });

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'public, max-age=60',
      },
      body: JSON.stringify(result),
    };
  } catch (error) {
    console.error('Error fetching ads:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
      },
      body: JSON.stringify({ error: 'Failed to fetch ads' }),
    };
  }
};
