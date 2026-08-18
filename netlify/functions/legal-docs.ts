// netlify/functions/legal-docs.ts
// Public legal document registry endpoint (design D8; WU2b task 2.4).
//
//   GET /api/legal-docs → 200 {documents: [{id, version, effectiveDate,
//   hash, purposes, legalBases, locale}]} — ACTIVE registry entries, METADATA
//   ONLY (no section wording, no internal flags). Public: no auth.
//
// Source of truth: src/config/legal.ts (D1) — future-dated versions are never
// active, so they are never returned.

import { activeLegalDocs } from '../../src/config/legal';

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
    const documents = activeLegalDocs().map((doc) => ({
      id: doc.id,
      version: doc.version,
      effectiveDate: doc.effectiveDate,
      hash: doc.hash,
      purposes: doc.purposes,
      legalBases: doc.legalBases,
      locale: doc.locale,
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ documents }) };
  } catch (error) {
    console.error('[legal-docs] failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao consultar documentos legais' }),
    };
  }
};
