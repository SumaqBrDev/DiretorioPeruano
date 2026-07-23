import prisma from './lib/prisma';

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };

  // POST — Create a new business
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { name, description, category, address, tags, photos, ownerId, contact } = body;

      if (!name || !description || !ownerId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Campos obrigatórios: name, description, ownerId' }),
        };
      }

      const business = await prisma.businessProfile.create({
        data: {
          name,
          description,
          category: category || 'restaurante',
          address: address || {},
          tags: tags || [],
          photos: photos || [],
          contact: contact || {},
          ownerId,
          status: 'pending',
        },
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(business),
      };
    } catch (error: any) {
      console.error('Error creating business:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao criar negócio', details: error.message }),
      };
    }
  }

  // GET — List businesses (existing behavior)
  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const { q, category, city, minRating } = params;

      const where: any = { status: 'approved' };

      if (q) {
        where.OR = [
          { name: { contains: q, mode: 'insensitive' } },
          { description: { contains: q, mode: 'insensitive' } },
          { tags: { hasSome: [q] } },
        ];
      }

      if (category) {
        where.category = category;
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
        headers,
        body: JSON.stringify(mapped),
      };
    } catch (error) {
      console.error('Error fetching businesses:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch businesses' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: { ...headers, Allow: 'GET, POST' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
