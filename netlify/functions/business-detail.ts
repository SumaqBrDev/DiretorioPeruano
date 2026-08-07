// netlify/functions/business-detail.ts
// Public single-business detail by id (approved only). No Clerk auth required (public read).
import prisma from './lib/prisma';

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const params = event.queryStringParameters || {};
  const { id } = params;

  if (!id) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'id é obrigatório' }),
    };
  }

  try {
    const business = await prisma.businessProfile.findFirst({
      where: { id, status: 'approved' },
      include: {
        _count: { select: { reviews: true } },
      },
    });

    if (!business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Negócio não encontrado' }),
      };
    }

    const address = (business.address as any) || {};
    const contact = (business.contact as any) || {};

    const mapped = {
      id: business.id,
      name: business.name,
      category: business.category,
      description: business.description,
      city: address.city || '',
      state: address.state || '',
      address: {
        street: address.street || '',
        city: address.city || '',
        state: address.state || '',
        zip: address.zip || '',
      },
      cnpj: business.cnpj || null,
      ownerFullName: business.ownerFullName || '',
      ownerBirthCity: business.ownerBirthCity || '',
      tags: business.tags || [],
      photos: business.photos || [],
      contact: business.contact || {},
      rating: business.rating || 0,
      reviewsCount: business._count.reviews,
      email: contact.email || '',
      phone: contact.phone || '',
      whatsapp: contact.whatsapp || '',
      website: contact.website || '',
      status: business.status,
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(mapped),
    };
  } catch (error) {
    console.error('Error fetching business detail:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch business' }),
    };
  }
};
