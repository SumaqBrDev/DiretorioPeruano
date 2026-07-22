import prisma from './lib/prisma';

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };

  // POST — Create a new review
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { rating, comment, businessId, consumerId } = body;

      if (!rating || !comment || !businessId || !consumerId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Campos obrigatórios: rating, comment, businessId, consumerId' }),
        };
      }

      if (rating < 1 || rating > 5) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Rating deve ser entre 1 e 5' }),
        };
      }

      const review = await prisma.review.create({
        data: {
          rating,
          comment,
          status: 'pending',
          businessId,
          consumerId,
        },
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(review),
      };
    } catch (error: any) {
      console.error('Error creating review:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao criar avaliação', details: error.message }),
      };
    }
  }

  // GET — List reviews for a business
  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const { businessId } = params;

      if (!businessId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'businessId é obrigatório' }),
        };
      }

      const reviews = await prisma.review.findMany({
        where: {
          businessId,
          status: 'approved',
        },
        orderBy: { createdAt: 'desc' },
        include: {
          consumer: { select: { name: true } },
        },
      });

      const mapped = reviews.map((r) => ({
        id: r.id,
        author: r.consumer?.name || 'Anônimo',
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt.toISOString().split('T')[0],
      }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(mapped),
      };
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch reviews' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: { ...headers, Allow: 'GET, POST' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
