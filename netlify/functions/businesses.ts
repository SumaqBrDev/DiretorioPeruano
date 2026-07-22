import { Handler, HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';

export const handler: Handler = async (event: HandlerEvent) => {
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

    let businesses = await prisma.businessProfile.findMany({
      where,
      take: 50,
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { reviews: true } },
      },
    });

    if (minRating) {
      const min = parseFloat(minRating);
      businesses = businesses.filter((b) => {
        return true;
      });
    }

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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mapped),
    };
  } catch (error) {
    console.error('Error fetching businesses:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch businesses' }),
    };
  }
};
