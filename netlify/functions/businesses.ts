import prisma from './lib/prisma';
import { validateCnpj } from './lib/cnpj';
import { authenticateRequest } from './lib/auth';

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };

  // POST — Create a new business (authenticated owner; owner derived from token)
  if (event.httpMethod === 'POST') {
    try {
      const auth = await authenticateRequest(event);
      if (!auth.ok) {
        return {
          statusCode: auth.statusCode || 401,
          headers,
          body: JSON.stringify({ error: auth.error || 'No autorizado' }),
        };
      }
      const owner = await prisma.user.findUnique({
        where: { clerkId: auth.clerkId! },
      });
      if (!owner) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({ error: 'Usuário não encontrado' }),
        };
      }

      // Business rule (payment model): consumer accounts cannot register
      // businesses — revenue comes from businesses paying for internal
      // resources. A consumer that registers would get owner benefits
      // without entering the subscription funnel.
      if (owner.role === 'consumer') {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({ error: 'Apenas contas empresariais podem cadastrar negócios' }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { name, description, category, address, tags, photos, contact, cnpj, ownerFullName, ownerBirthCity } = body;

      if (!name || !description) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Campos obrigatórios: name, description, ownerId' }),
        };
      }

      // KYC: when a CNPJ is provided it must be valid; otherwise the KYC
      // fields stay null (they MAY be null until the business is approved).
      let normalizedCnpj: string | null = null;
      if (cnpj) {
        const result = await validateCnpj(cnpj);
        if (!result.valid) {
          return {
            statusCode: 400,
            headers,
            body: JSON.stringify({ error: 'CNPJ inválido' }),
          };
        }
        normalizedCnpj = String(cnpj).replace(/\D/g, '');
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
          ownerId: owner.id,
          status: 'pending',
          cnpj: normalizedCnpj,
          ownerFullName: ownerFullName || null,
          ownerBirthCity: ownerBirthCity || null,
        },
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(business),
      };
    } catch (error: any) {
      // cnpj is UNIQUE in the schema: duplicate → friendly 409, no leak.
      if (error?.code === 'P2002') {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({ error: 'CNPJ já cadastrado' }),
        };
      }
      console.error('Error creating business:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao criar negócio' }),
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
          { address: { path: ['street'], string_contains: q } },
          { tags: { hasSome: [q, q.toLowerCase()] } },
        ];
      }

      if (category) {
        where.category = category;
      }

      if (city) {
        where.address = { path: ['city'], string_contains: city };
      }

      if (minRating) {
        const min = Number(minRating);
        if (!Number.isNaN(min)) {
          // gte excludes NULL ratings: businesses without reviews never match
          where.rating = { gte: min };
        }
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
        rating: b.rating ?? 0,
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
