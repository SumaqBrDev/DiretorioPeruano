// netlify/functions/consent-admin.ts
// LGPD governance read view (design D8; WU2b task 2.4).
//
//   GET /api/consent/admin?page=&pageSize=&documentType=&source=
//     SUPERADMIN ONLY (requireSuperAdmin). Paginated, filterable by
//     documentType/source; returns subject id only (no PII beyond the
//     subject — spec: Observability and admin governance view).
//
// Envelope {error, code?} (D6); invalid closed-list filters → 422.

import prisma from './lib/prisma';
import { requireSuperAdmin } from './lib/auth';
import { CLOSED_LISTS } from '../../src/config/legal';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function toPositiveInt(raw: string | undefined, fallback: number): number {
  const parsed = parseInt(raw ?? '', 10);
  if (Number.isNaN(parsed) || parsed < 1) return fallback;
  return parsed;
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const auth = await requireSuperAdmin(event);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode || 401,
        headers,
        body: JSON.stringify({ error: auth.error || 'No autorizado' }),
      };
    }

    const params = event.queryStringParameters || {};
    const { documentType, source } = params;

    // Closed-list filter validation — unknown values are rejected (422).
    if (documentType !== undefined && !CLOSED_LISTS.documentTypes.includes(documentType)) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error: `Unknown documentType filter '${documentType}'`,
          code: 'INVALID_PAYLOAD',
        }),
      };
    }
    if (source !== undefined && !CLOSED_LISTS.sources.includes(source)) {
      return {
        statusCode: 422,
        headers,
        body: JSON.stringify({
          error: `Unknown source filter '${source}'`,
          code: 'INVALID_PAYLOAD',
        }),
      };
    }

    const page = toPositiveInt(params.page, 1);
    const pageSize = Math.min(MAX_PAGE_SIZE, toPositiveInt(params.pageSize, DEFAULT_PAGE_SIZE));

    const where: Record<string, string> = {};
    if (documentType !== undefined) where.documentType = documentType;
    if (source !== undefined) where.source = source;

    const [total, records] = await Promise.all([
      prisma.consentRecord.count({ where }),
      prisma.consentRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    // Picked fields: subject id only — email/name/role never reach this view.
    const picked = records.map((r) => ({
      id: r.id,
      userId: r.userId,
      documentType: r.documentType,
      documentVersion: r.documentVersion,
      documentHash: r.documentHash,
      purpose: r.purpose,
      legalBasis: r.legalBasis,
      intent: r.intent,
      granted: r.granted,
      consentedAt: r.consentedAt,
      revokedAt: r.revokedAt ?? null,
      source: r.source,
      locale: r.locale,
      idempotencyKey: r.idempotencyKey,
      createdAt: r.createdAt,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ records: picked, total, page, pageSize }),
    };
  } catch (error) {
    console.error('[consent-admin] failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao consultar governança de consentimentos' }),
    };
  }
};
