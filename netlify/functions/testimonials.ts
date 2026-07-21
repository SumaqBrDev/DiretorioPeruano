import { Handler } from '@netlify/functions';
import prisma from '../../src/lib/prisma';

export const handler: Handler = async () => {
  try {
    const reviews = await prisma.review.findMany({
      where: { status: 'approved' },
      include: {
        consumer: { select: { name: true } },
        business: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 3,
    });

    const testimonials = reviews.map((r) => ({
      id: r.id,
      author: r.consumer.name || 'Anônimo',
      city: '',
      rating: r.rating,
      text: r.comment,
      tags: [],
    }));

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testimonials),
    };
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch testimonials' }),
    };
  }
};
