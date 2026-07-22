import prisma from './lib/prisma';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * Verify superadmin role from Clerk user ID
 */
async function verifySuperAdmin(clerkId: string): Promise<boolean> {
  if (!clerkId) return false;

  const user = await prisma.user.findUnique({
    where: { clerkId },
    select: { role: true },
  });

  return user?.role === 'superadmin';
}

export const handler = async (event: any) => {
  // Only allow GET
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify superadmin
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'No autorizado — token requerido' }),
      };
    }

    // For Netlify Functions, we receive the Clerk user ID directly in the
    // Authorization header (set by the frontend after Clerk auth)
    const isSuperAdmin = await verifySuperAdmin(token);
    if (!isSuperAdmin) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acceso denegado — se requiere rol superadmin' }),
      };
    }

    // Parse query params
    const params = event.queryStringParameters || {};
    const status = params.status || 'ALL';
    const search = params.search || '';
    const page = Math.max(1, parseInt(params.page || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(params.limit || '20', 10)));
    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (status !== 'ALL') {
      where.status = status.toLowerCase();
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { cnpj: { contains: search, mode: 'insensitive' } },
        { owner: { name: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // Get total count
    const total = await prisma.businessProfile.count({ where });

    // Get businesses
    const businesses = await prisma.businessProfile.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    const totalPages = Math.ceil(total / limit);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        businesses: businesses.map((b) => ({
          id: b.id,
          name: b.name,
          category: b.category,
          status: b.status,
          subscriptionStatus: b.subscriptionStatus,
          rejectionReason: b.rejectionReason,
          approvedAt: b.approvedAt,
          trialEndsAt: b.trialEndsAt,
          createdAt: b.createdAt,
          owner: b.owner,
          reviewsCount: b._count.reviews,
          city: (b.address as any)?.city || '',
          state: (b.address as any)?.state || '',
          cnpj: b.cnpj,
        })),
        total,
        page,
        totalPages,
      }),
    };
  } catch (error: any) {
    console.error('Error in admin-businesses:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al listar negocios', details: error.message }),
    };
  }
};
