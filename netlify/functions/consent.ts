// netlify/functions/consent.ts
// LGPD consent record + query endpoint (design D8; WU2b task 2.4).
//
// Routes (Netlify :splat maps /api/consent and /api/consent/status to this
// function file):
//   POST /api/consent        record a GRANT for the ACTIVE document version
//                            201 {record} | 200 {record, duplicate:true} (idempotent)
//   GET  /api/consent        own consent history, newest first → 200 {records}
//   GET  /api/consent/status current mandatory-consent state
//                            → 200 {mandatoryCurrent, current[], requiredDocs[]}
//
// Security contract (spec consent-api): the subject is ALWAYS derived from the
// verified Clerk token (ensureUserByClerkId upsert, D4); a body `userId`
// targeting another user is rejected with 403 CROSS_USER_TARGETING and records
// nothing. Envelope {error, code?} (D6). No IP/userAgent capture (D5).

import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';
import {
  ensureUserByClerkId,
  recordConsent,
  assertCurrentMandatoryConsent,
  resolveCurrentConsents,
} from './lib/consent';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const RECORD_REQUIRED_FIELDS = ['documentType', 'purpose', 'legalBasis', 'source', 'idempotencyKey'] as const;

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

function invalidJson() {
  return {
    statusCode: 422,
    headers,
    body: JSON.stringify({ error: 'Invalid JSON body', code: 'INVALID_PAYLOAD' }),
  };
}

async function postRecord(event: any) {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.ok) return unauthorized(auth);

    const body = parseBody(event);
    if (!body) return invalidJson();

    // Server-derived subject: provision/refresh the user from verified claims.
    const user = await ensureUserByClerkId(auth.clerkId!, auth.claims ?? {}, { prisma });

    // Cross-user targeting: the body may MATCH the subject but never name
    // another user (403 + nothing recorded).
    if (body.userId !== undefined && body.userId !== user.id) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Cross-user targeting is not allowed', code: 'CROSS_USER_TARGETING' }),
      };
    }

    const missing = RECORD_REQUIRED_FIELDS.filter(
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

    const result = await recordConsent(
      {
        userId: user.id,
        documentType: body.documentType,
        documentVersion: body.documentVersion,
        purpose: body.purpose,
        legalBasis: body.legalBasis,
        source: body.source,
        locale: typeof body.locale === 'string' && body.locale ? body.locale : 'pt-BR',
        granted: body.granted,
        idempotencyKey: body.idempotencyKey,
      },
      { prisma }
    );

    if (result.ok !== true) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({ error: result.errors.join('; '), code: result.code }),
      };
    }

    // Idempotent duplicate submit → 200 {record, duplicate:true} (D2).
    return {
      statusCode: result.duplicate ? 200 : 201,
      headers,
      body: JSON.stringify(
        result.duplicate ? { record: result.record, duplicate: true } : { record: result.record }
      ),
    };
  } catch (error) {
    console.error('[consent] POST record failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao registrar consentimento' }),
    };
  }
}

async function getHistory(event: any) {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.ok) return unauthorized(auth);

    const user = await ensureUserByClerkId(auth.clerkId!, auth.claims ?? {}, { prisma });
    // Own rows only, newest first (spec: query own history).
    const records = await prisma.consentRecord.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });

    return { statusCode: 200, headers, body: JSON.stringify({ records }) };
  } catch (error) {
    console.error('[consent] GET history failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao consultar consentimentos' }),
    };
  }
}

async function getStatus(event: any) {
  try {
    const auth = await authenticateRequest(event);
    if (!auth.ok) return unauthorized(auth);

    const user = await ensureUserByClerkId(auth.clerkId!, auth.claims ?? {}, { prisma });
    const gate = await assertCurrentMandatoryConsent(user.id, { prisma });
    const current = await resolveCurrentConsents(user.id, { prisma });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        mandatoryCurrent: gate.ok === true,
        current: current.map((c) => ({
          documentType: c.documentType,
          version: c.documentVersion,
          granted: c.granted,
          consentedAt: c.consentedAt,
        })),
        requiredDocs: gate.ok === true ? [] : gate.requiredDocs,
      }),
    };
  } catch (error) {
    console.error('[consent] GET status failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao consultar estado de consentimento' }),
    };
  }
}

export const handler = async (event: any) => {
  const method = event.httpMethod;
  const path = event.path || '';
  const isStatus = path.endsWith('/status');

  if (method === 'GET' && isStatus) return getStatus(event);
  if (method === 'GET') return getHistory(event);
  if (method === 'POST') return postRecord(event);

  return {
    statusCode: 405,
    headers: { ...headers, Allow: 'GET, POST' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
