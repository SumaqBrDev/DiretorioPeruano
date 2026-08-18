// netlify/functions/consent-revoke.ts
// LGPD consent revocation endpoint (design D8; WU2b task 2.4).
//
//   POST /api/consent/revoke  body {documentType, purpose, idempotencyKey}
//     → 201 appended granted=false (optional consents only)
//     → 409 {code:'MANDATORY_NOT_REVOCABLE'} (purpose=service while active)
//     → 404 {code:'DOCUMENT_NOT_FOUND'} (unknown/inactive document)
//     → 422 {code:'INVALID_PAYLOAD'} (closed-list / missing fields)
//     → 403 {code:'CROSS_USER_TARGETING'} (body userId ≠ subject)
//
// Subject derived ONLY from the verified Clerk token (D4); revocations are
// append-only rows — the prior grant row is never updated.

import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';
import { ensureUserByClerkId, revokeConsent } from './lib/consent';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const REVOKE_REQUIRED_FIELDS = ['documentType', 'purpose', 'idempotencyKey'] as const;

function unauthorized(auth: any) {
  return {
    statusCode: auth.statusCode || 401,
    headers,
    body: JSON.stringify({ error: auth.error || 'No autorizado' }),
  };
}

function parseBody(event: any): any {
  try {
    return event.body ? JSON.parse(event.body) : {};
  } catch {
    return null;
  }
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const auth = await authenticateRequest(event);
    if (!auth.ok) return unauthorized(auth);

    const body = parseBody(event);
    if (!body) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_PAYLOAD' }),
      };
    }

    const user = await ensureUserByClerkId(auth.clerkId!, auth.claims ?? {}, { prisma });

    if (body.userId !== undefined && body.userId !== user.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Cross-user targeting is not allowed', code: 'CROSS_USER_TARGETING' }),
      };
    }

    const missing = REVOKE_REQUIRED_FIELDS.filter(
      (f) => typeof body[f] !== 'string' || body[f].trim() === ''
    );
    if (missing.length) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error: `Missing required fields: ${missing.join(', ')}`,
          code: 'INVALID_PAYLOAD',
        }),
      };
    }

    const result = await revokeConsent(
      {
        userId: user.id,
        documentType: body.documentType,
        purpose: body.purpose,
        idempotencyKey: body.idempotencyKey,
        source: body.source,
        locale: body.locale,
      },
      { prisma }
    );

    if (result.ok !== true) {
      const statusByCode: Record<string, number> = {
        MANDATORY_NOT_REVOCABLE: 409,
        DOCUMENT_NOT_FOUND: 404,
        INVALID_PAYLOAD: 422,
      };
      return {
        statusCode: statusByCode[result.code] || 422,
        headers,
        body: JSON.stringify({ error: result.errors.join('; '), code: result.code }),
      };
    }

    return {
      statusCode: result.duplicate ? 200 : 201,
      headers,
      body: JSON.stringify(
        result.duplicate ? { record: result.record, duplicate: true } : { record: result.record }
      ),
    };
  } catch (error) {
    console.error('[consent-revoke] failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao revogar consentimento' }),
    };
  }
};
