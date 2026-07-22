
import prisma from './lib/prisma';

export const handler = async (event: any) => {
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
    const params = event.queryStringParameters || {};
    const { q, category, city, minRating } = params;

    const where: any = { status: 'active' };

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { tags: { hasSome: [q] } },
      ];
    }

    if (category) {
      where.category = { equals: category, mode: 'insensitive' };
    }

    if (city) {
      where.address = { path: ['city'], string_contains: city };
    }

    const businesses = await prisma.businessProfile.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { reviews: true } },
      },
    });

    const mapped = businesses.map((b) => ({
      id: b.id,
      name: b.name,
      category: b.category,
      city: (b.address as any)?.city || '',
      state: (b.address as any)?.state || '',
      address: (b.address as any)?.street || '',
      rating: 0,
      reviewsCount: b._count.reviews,
      tags: b.tags || [],
      coverImage: b.photos?.[0] || '',
      description: b.description,
    }));

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      },
      body: JSON.stringify(mapped),
    };
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
      },
      body: JSON.stringify({ error: 'Failed to fetch businesses' }),
    };
  }
};
