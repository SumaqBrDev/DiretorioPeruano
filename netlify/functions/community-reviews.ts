import prisma from './lib/prisma';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Home "Comunidade" section — returns up to `limit` (default 6) reviews that:
 *  - have rating 5 (best)
 *  - belong to APPROVED businesses
 *  - come from DISTINCT businesses (one review per business)
 * A fresh random set is produced per request.
 */
export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const params = event.queryStringParameters || {};
    const limit = Math.min(20, Math.max(1, parseInt(params.limit || '6', 10)));

    // All approved business ids that have a 5-star review
    const fiveStarBusinesses = await prisma.businessProfile.findMany({
      where: {
        status: 'approved',
        reviews: { some: { rating: 5, status: 'approved' } },
      },
      select: { id: true },
      take: 200,
    });

    const businessIds = fiveStarBusinesses.map((b) => b.id);

    // Deterministic-ish: pick up to `limit` distinct business ids, randomized
    const shuffled = [...businessIds].sort(() => Math.random() - 0.5).slice(0, limit);

    if (shuffled.length === 0) {
      return { statusCode: 200, headers, body: JSON.stringify([]) };
    }

    const reviews = await prisma.review.findMany({
      where: {
        rating: 5,
        status: 'approved',
        businessId: { in: shuffled },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        business: { select: { name: true } },
        consumer: { select: { name: true } },
      },
    });

    // Keep at most one review per business (prefer the most recent)
    const seen = new Set<string>();
    const result: Array<{
      id: string;
      author: string;
      comment: string;
      rating: number;
      businessName: string;
      date: string;
    }> = [];
    for (const r of reviews) {
      if (seen.has(r.businessId)) continue;
      seen.add(r.businessId);
      result.push({
        id: r.id,
        author: r.consumer?.name || 'Anônimo',
        comment: r.comment,
        rating: r.rating,
        businessName: r.business?.name || '',
        date: r.createdAt.toISOString().split('T')[0],
      });
      if (result.length >= limit) break;
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(result),
    };
  } catch (error: any) {
    console.error('Error in community-reviews:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao buscar avaliações da comunidade', details: error.message }),
    };
  }
};
