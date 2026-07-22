import { Handler, HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';

export const handler: Handler = async (event: HandlerEvent) => {
  // Security: Only allow GET requests for this read-only endpoint
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
    const businesses = await prisma.businessProfile.findMany({
      where: { status: 'active' },
      take: 6,
      orderBy: {
        reviews: { _count: 'desc' },
      },
      include: {
        _count: { select: { reviews: true } },
      },
    });

    const featured = businesses.map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      city: (b.address as any)?.city || '',
      state: (b.address as any)?.state || '',
      rating: 0,
      reviewsCount: b._count.reviews,
      tags: b.tags || [],
      coverImage: b.photos?.[0] || '',
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      },
      body: JSON.stringify(featured),
    };
  } catch (error) {
    console.error('Error fetching featured:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
      },
      body: JSON.stringify({ error: 'Failed to fetch featured businesses' }),
    };
  }
};
