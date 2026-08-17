// netlify/functions/consent-preferences.ts
// LGPD cookie-category preferences endpoint (design D7/D8; WU2b task 2.4).
//
//   GET  /api/consent/preferences → 200 {preferences} | {preferences: null}
//   POST /api/consent/preferences body {policyVersion, categories, locale?}
//        → 200 {preferences} (CookiePreference UPSERT per user — current UI
//        state, NOT evidence; optional-category grants go through /api/consent)
//
// Validation: policyVersion required; categories must be a plain object whose
// keys are known cookie-category ids (COOKIE_CATEGORIES from the legal
// registry, single source D1) with boolean values; locale is closed-list.
// Envelope {error, code?} (D6).

import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';
import { ensureUserByClerkId } from './lib/consent';
import { COOKIE_CATEGORIES, CLOSED_LISTS } from '../../src/config/legal';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const CATEGORY_IDS = COOKIE_CATEGORIES.map((c) => c.id);

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

function invalidPayload(error: string) {
  return {
    statusCode: 422,
    headers,
    body: JSON.stringify({ error, code: 'INVALID_PAYLOAD' }),
  };
}

async function getPreferences(event: any) {
  const auth = await authenticateRequest(event);
  if (!auth.ok) return unauthorized(auth);

  const user = await ensureUserByClerkId(auth.clerkId!, auth.claims ?? {}, { prisma });
  const preferences = await prisma.cookiePreference.findUnique({
    where: { userId: user.id },
  });

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ preferences: preferences ?? null }),
  };
}

async function postPreferences(event: any) {
  const auth = await authenticateRequest(event);
  if (!auth.ok) return unauthorized(auth);

  const body = parseBody(event);
  if (!body) return invalidPayload('Invalid JSON body');

  if (typeof body.policyVersion !== 'string' || body.policyVersion.trim() === '') {
    return invalidPayload('policyVersion is required');
  }

  const categories = body.categories;
  if (typeof categories !== 'object' || categories === null || Array.isArray(categories)) {
    return invalidPayload('categories must be an object');
  }
  for (const [key, value] of Object.entries(categories)) {
    if (!CATEGORY_IDS.includes(key)) {
      return invalidPayload(`unknown category '${key}'`);
    }
    if (typeof value !== 'boolean') {
      return invalidPayload(`category '${key}' must be a boolean`);
    }
  }

  const locale = body.locale === undefined ? 'pt-BR' : body.locale;
  if (!CLOSED_LISTS.locales.includes(locale)) {
    return invalidPayload(`locale '${locale}' is not allowed`);
  }

  const user = await ensureUserByClerkId(auth.clerkId!, auth.claims ?? {}, { prisma });
  const preferences = await prisma.cookiePreference.upsert({
    where: { userId: user.id },
    update: { policyVersion: body.policyVersion, categories, locale },
    create: { userId: user.id, policyVersion: body.policyVersion, categories, locale },
  });

  return { statusCode: 200, headers, body: JSON.stringify({ preferences }) };
}

export const handler = async (event: any) => {
  if (event.httpMethod === 'GET') return getPreferences(event);
  if (event.httpMethod === 'POST') return postPreferences(event);

  return {
    statusCode: 405,
    headers: { ...headers, Allow: 'GET, POST' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
