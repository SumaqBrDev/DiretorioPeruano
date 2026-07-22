import { Handler, HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';

export const handler = async (event: HandlerEvent) => {
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
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      },
      body: JSON.stringify(testimonials),
    };
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Frame-Options': 'DENY',
      },
      body: JSON.stringify({ error: 'Failed to fetch testimonials' }),
    };
  }
};
