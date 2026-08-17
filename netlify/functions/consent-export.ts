// netlify/functions/consent-export.ts
// LGPD data-subject export endpoint (design D8; WU2b task 2.4).
//
//   GET /api/consent/export → 200 {profile{id,email,name}, consents[],
//   cookiePreferences[]} — OWN data only (LGPD access/portability channel).
//
// Security contract (spec consent-rights-preferences/Export): the subject is
// derived from the verified Clerk token only; the payload is built by
// lib/consent.buildExport, which PICKS fields so internal/other-user/secret
// data (including password hashes, roles, Stripe ids) can never leak.

import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';
import { ensureUserByClerkId, buildExport } from './lib/consent';

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
    const auth = await authenticateRequest(event);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode || 401,
        headers,
        body: JSON.stringify({ error: auth.error || 'No autorizado' }),
      };
    }

    const user = await ensureUserByClerkId(auth.clerkId!, auth.claims ?? {}, { prisma });

    // Own data only: both queries are scoped to the server-derived subject.
    const [consents, cookiePreferences] = await Promise.all([
      prisma.consentRecord.findMany({ where: { userId: user.id } }),
      prisma.cookiePreference.findMany({ where: { userId: user.id } }),
    ]);

    const payload = buildExport({ user, consents, cookiePreferences });
    return { statusCode: 200, headers, body: JSON.stringify(payload) };
  } catch (error) {
    console.error('[consent-export] failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao gerar exportação de dados' }),
    };
  }
};
