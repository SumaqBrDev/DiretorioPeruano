import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';
import { resolveOwnedBusiness } from './lib/ownership';
import { validateCnpj } from './lib/cnpj';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

/**
 * GET/PUT "my business" for the authenticated user.
 * Maps to PRODUCT.md: GET /api/businesses/me and PUT /api/businesses/me.
 */
export const handler = async (event: HandlerEvent) => {
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
    select: { id: true },
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
    const owned = await resolveOwnedBusiness(user.id, event.queryStringParameters?.businessId, { includeAds: true });
    if (!owned.ok) {
      return { statusCode: owned.statusCode, headers, body: JSON.stringify({ error: owned.error }) };
    }
    const business = owned.business;
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(business),
    };
  }

  // ── PUT: update the user's own business ──
  if (event.httpMethod === 'PUT' || event.httpMethod === 'PATCH') {
    const requestedBusinessId = event.queryStringParameters?.businessId;
    const owned = await resolveOwnedBusiness(user.id, requestedBusinessId);
    if (!owned.ok) {
      return { statusCode: owned.statusCode, headers, body: JSON.stringify({ error: owned.error }) };
    }
    const business = owned.business as any;

    // BUG-033 (AC14): a disabled business is read-only — the owner panel shows
    // a read-only banner, so the backend must reject mutations too (the UI-only
    // guard was bypassable via direct API calls).
    if (business.status === 'disabled') {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Negócio desabilitado — edição não permitida' }),
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
      const current = (business.address as any) || {};
      data.address = { ...current, ...body.address };
    }

    // Contact (JSONB in Neon)
    if (body.contact !== undefined) {
      const current = (business.contact as any) || {};
      data.contact = { ...current, ...body.contact };
    }

    // KYC fields
    if (body.cnpj !== undefined) {
      const cnpj = String(body.cnpj || '').replace(/\D/g, '');
      if (!cnpj) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'CNPJ é obrigatório' }) };
      }
      const result = await validateCnpj(cnpj);
      if (!result.valid) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'CNPJ inválido' }) };
      }
      data.cnpj = cnpj;
    }
    if (body.ownerFullName !== undefined) data.ownerFullName = body.ownerFullName;
    if (body.ownerBirthCity !== undefined) data.ownerBirthCity = body.ownerBirthCity;
    if (body.photos !== undefined) data.photos = body.photos;

    // Rejected businesses that are edited resubmit for review (BUG-024: the
    // owner's corrected submission must return to the admin pending queue).
    if (business.status === 'rejected') {
      data.status = 'pending';
      data.rejectionReason = null;
    }

    const updated = await prisma.businessProfile.update({
      where: { id: business.id },
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
