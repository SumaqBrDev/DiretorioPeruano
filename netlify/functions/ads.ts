// netlify/functions/ads.ts
// Public read endpoint: active paid ads for the Comunidad section.
// Opción A (sidebar 300x250) + Opción B (featured card) both consume this.
// Ordering: soonest-expiring first → fair rotation, no manual curation.
import { Handler, HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';

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
        business: { status: 'approved' },
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
      },
    });

    const result = ads.map((ad) => ({
      id: ad.id,
      businessId: ad.businessId,
      businessName: ad.business.name,
      category: ad.business.category,
      rating: ad.business.rating || 0,
      title: ad.title,
      imageUrl: ad.imageUrl || ad.business.photos?.[0] || '',
      targetUrl: ad.targetUrl || null,
      startsAt: ad.startsAt?.toISOString() || null,
      endsAt: ad.endsAt?.toISOString() || null,
    }));

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
