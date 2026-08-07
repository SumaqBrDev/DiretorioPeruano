import prisma from './lib/prisma';
import { requireSuperAdmin } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};


export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Verify superadmin: validate Clerk token + superadmin role in PostgreSQL
    const auth = await requireSuperAdmin(event);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    // Extract business ID from path
    // Netlify functions: path is /.netlify/functions/admin-business-detail
    // The business ID is passed as query param ?id=xxx or from the path
    const pathParts = event.path?.split('/') || [];
    let businessId = event.queryStringParameters?.id || '';

    // Try to extract from path: /api/admin/businesses/:id
    // In Netlify, the full path is /.netlify/functions/admin-business-detail
    // We'll use the query param approach

    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'ID del negocio requerido (query param: id)' }),
      };
    }

    // Fetch business with reviews and owner
    const business = await prisma.businessProfile.findUnique({
      where: { id: businessId },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
          },
        },
        reviews: {
          orderBy: { createdAt: 'desc' },
          include: {
            consumer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Negocio no encontrado' }),
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        business: {
          id: business.id,
          name: business.name,
          description: business.description,
          category: business.category,
          address: business.address,
          tags: business.tags,
          photos: business.photos,
          contact: business.contact,
          status: business.status,
          rejectionReason: business.rejectionReason,
          approvedAt: business.approvedAt,
          stripeCustomerId: business.stripeCustomerId,
          subscriptionId: business.subscriptionId,
          subscriptionStatus: business.subscriptionStatus,
          trialEndsAt: business.trialEndsAt,
          ownerFullName: business.ownerFullName,
          ownerBirthCity: business.ownerBirthCity,
          cnpj: business.cnpj,
          createdAt: business.createdAt,
          updatedAt: business.updatedAt,
        },
        reviews: business.reviews.map((r) => ({
          id: r.id,
          rating: r.rating,
          comment: r.comment,
          status: r.status,
          createdAt: r.createdAt,
          consumer: r.consumer,
        })),
        owner: business.owner,
      }),
    };
  } catch (error: any) {
    console.error('Error in admin-business-detail:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Error al obtener detalle del negocio', details: error.message }),
    };
  }
};
