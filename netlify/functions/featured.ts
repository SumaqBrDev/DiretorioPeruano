import { Handler } from '@netlify/functions';
import prisma from '../../src/lib/prisma';

export const handler: Handler = async () => {
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(featured),
    };
  } catch (error) {
    console.error('Error fetching featured:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch featured businesses' }),
    };
  }
};
