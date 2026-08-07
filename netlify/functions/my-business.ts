import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * GET/PUT "my business" for the authenticated user.
 * Maps to PRODUCT.md: GET /api/businesses/me and PUT /api/businesses/me.
 */
export const handler = async (event: any) => {
  const auth = await authenticateRequest(event);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode,
      headers,
      body: JSON.stringify({ error: auth.error }),
    };
  }

  // Resolve the logged-in user (by verified Clerk id) and their business
  const user = await prisma.user.findUnique({
    where: { clerkId: auth.clerkId! },
    include: { business: true },
  });

  if (!user) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify({ error: 'Usuario no encontrado' }),
    };
  }

  // ── GET: return the user's business (or 404 if none) ──
  if (event.httpMethod === 'GET') {
    if (!user.business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'El usuario no posee un negocio' }),
      };
    }
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(user.business),
    };
  }

  // ── PUT: update the user's own business ──
  if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    if (!user.business) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'El usuario no posee un negocio' }),
      };
    }

    let body: any = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'JSON inválido en el cuerpo' }),
      };
    }

    const data: any = {};

    // Basic fields
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.category !== undefined) data.category = body.category;
    if (body.tags !== undefined) data.tags = body.tags;

    // Address (JSONB in Neon) — merge with existing if partial
    if (body.address !== undefined) {
      const current = (user.business.address as any) || {};
      data.address = { ...current, ...body.address };
    }

    // Contact (JSONB in Neon)
    if (body.contact !== undefined) {
      const current = (user.business.contact as any) || {};
      data.contact = { ...current, ...body.contact };
    }

    // KYC fields
    if (body.cnpj !== undefined) data.cnpj = body.cnpj;
    if (body.ownerFullName !== undefined) data.ownerFullName = body.ownerFullName;
    if (body.ownerBirthCity !== undefined) data.ownerBirthCity = body.ownerBirthCity;
    if (body.photos !== undefined) data.photos = body.photos;

    // Rejected businesses that are edited resubmit for review (BUG-024: the
    // owner's corrected submission must return to the admin pending queue).
    if (user.business.status === 'rejected') {
      data.status = 'pending';
      data.rejectionReason = null;
    }

    const updated = await prisma.businessProfile.update({
      where: { id: user.business.id },
      data,
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(updated),
    };
  }

  return {
    statusCode: 405,
    headers: { ...headers, Allow: 'GET, PUT, PATCH' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
