import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { validateCnpj } from './lib/cnpj';
import { authenticateRequest } from './lib/auth';
import { assertCurrentMandatoryConsent } from './lib/consent';

export const handler = async (event: HandlerEvent) => {
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

      // LGPD re-consent gate (design D3, spec consent-api/Re-consent gate):
      // the owner's mandatory service consent (latest row per document, active
      // version) must be current before any business mutation. Stale/missing
      // → 409 CONSENT_REQUIRED (machine-readable, envelope D6); fail-closed
      // when no user row exists. admin/superadmin are exempt. Runs after
      // owner resolution and before the role check so gated users always get
      // the CONSENT_REQUIRED code.
      const gate = await assertCurrentMandatoryConsent(owner.id, { prisma });
      if (gate.ok !== true) {
        return {
          statusCode: 409,
          headers,
          body: JSON.stringify({
            error: 'Consentimento obrigatório desatualizado ou ausente — revise os Termos e a Política de Privacidade',
            code: gate.code,
          }),
        };
      }

      // Business rule (payment model): revenue comes from businesses paying a
      // subscription, so a plain consumer cannot register a business. The
      // upgrade funnel marks `businessIntentAt` when the user starts the
      // registration flow, which is what authorises this POST; the account is
      // only promoted to role='business' later, by the Stripe webhook, once
      // the subscription actually exists.
      //
      // The message is actionable on purpose: a blocked user must learn WHY
      // they are blocked and WHERE to go next, never just "not allowed".
      if (owner.role === 'consumer' && !owner.businessIntentAt) {
        return {
          statusCode: 403,
          headers,
          body: JSON.stringify({
            error:
              'Para cadastrar um negócio você precisa iniciar o cadastro empresarial, que inclui a assinatura com 30 dias de teste grátis.',
            code: 'BUSINESS_INTENT_REQUIRED',
            next: '/registrar-negocio',
          }),
        };
      }

      const body = JSON.parse(event.body || '{}');
      const { name, description, category, address, tags, photos, contact, cnpj, ownerFullName, ownerBirthCity } = body;

      if (!name || !description || !cnpj) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Campos obrigatórios: name, description, cnpj' }),
        };
      }

      // KYC: CNPJ is mandatory for new business registrations and must be valid.
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
          dataClassification: owner.dataClassification || 'real',
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
