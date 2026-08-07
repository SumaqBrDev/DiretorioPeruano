import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';
import { validateReviewInput, buildReviewCreateData } from './lib/reviews';

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };

  // POST — Create a new review (Clerk-authenticated, auto-approved)
  if (event.httpMethod === 'POST') {
    try {
      // Verify the Clerk session — the consumerId is derived server-side and
      // never trusted from the request body.
      const auth = await authenticateRequest(event);
      if (!auth.ok) {
        return {
          statusCode: auth.statusCode,
          headers,
          body: JSON.stringify({ error: auth.error }),
        };
      }

      const body = JSON.parse(event.body || '{}');

      const validationError = validateReviewInput(body);
      if (validationError) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: validationError }),
        };
      }

      // Resolve the internal user id for the verified Clerk id.
      const user = await prisma.user.findUnique({
        where: { clerkId: auth.clerkId! },
      });

      if (!user) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Usuário não encontrado' }),
        };
      }

      const review = await prisma.review.create({
        data: buildReviewCreateData(body, user.id),
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
