import { Handler } from '@netlify/functions';
import prisma from '../../src/lib/prisma';

export const handler: Handler = async () => {
  try {
    const [businessCount, allBusinesses, reviewCount] = await Promise.all([
      prisma.businessProfile.count({ where: { status: 'active' } }),
      prisma.businessProfile.findMany({
        where: { status: 'active' },
        select: { address: true, category: true },
      }),
      prisma.review.count({ where: { status: 'approved' } }),
    ]);

    const cities = new Set(
      allBusinesses.map((b) => (b.address as any)?.city).filter(Boolean)
    );
    const categories = new Set(allBusinesses.map((b) => b.category).filter(Boolean));

    const stats = [
      { label: 'stats.businesses', value: businessCount, suffix: '+' },
      { label: 'stats.cities', value: cities.size, suffix: '' },
      { label: 'stats.reviews', value: reviewCount, suffix: '+' },
      { label: 'stats.categories', value: categories.size, suffix: '' },
    ];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(stats),
    };
  } catch (error) {
    console.error('Error fetching stats:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch stats' }),
    };
  }
};
