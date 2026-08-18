// src/lib/signupIntent.ts
// Pure signup-intent helpers (WU3, design D1). The pre-signup checkboxes in
// Login capture UI INTENT only — sessionStorage is NEVER evidence. Evidence is
// the append-only ConsentRecord row written by POST /api/consent after the
// Clerk redirect (Onboarding step 0 / Reconsent).
//
// Pure, dependency-free TypeScript so node-env vitest can unit-test it
// (design D9: no jsdom). Consumed by Login, Onboarding and Reconsent.

import type { LegalDoc } from '../config/legal';

/** sessionStorage key for the signup intent (UI intent, never evidence). */
export const SIGNUP_INTENT_KEY = 'conectaperu_signup_intent';

export interface SignupIntent {
  /** Legal document ids the user accepted pre-signup (e.g. terms_of_service, privacy_policy). */
  legalVersions: string[];
  /** Optional consent ids accepted pre-signup, e.g. ['marketing']. */
  optionalAccepted: string[];
  /** Epoch ms of the intent capture. */
  ts: number;
}

/** Shape of one POST /api/consent body (server derives the subject). */
export interface ConsentRequestInput {
  documentType: string;
  documentVersion: string;
  purpose: string;
  legalBasis: string;
  source: string;
  locale: string;
  granted: boolean;
  idempotencyKey: string;
}

// Optional consent id → consent row mapping (design D7: optional categories are
// recorded as cookie_policy rows with purpose analytics|marketing, basis
// consent). Unknown ids are skipped — the server closed lists are authoritative.
const OPTIONAL_CONSENT_MAP: Record<string, { documentType: string; purpose: string; legalBasis: string }> = {
  marketing: { documentType: 'cookie_policy', purpose: 'marketing', legalBasis: 'consent' },
  analytics: { documentType: 'cookie_policy', purpose: 'analytics', legalBasis: 'consent' },
};

/**
 * Build the intent payload for sessionStorage. Throws when no mandatory
 * document is accepted — signup must be blocked until the mandatory checkbox
 * is checked (frontend gate; the server re-validates at POST /api/businesses
 * via CONSENT_REQUIRED).
 */
export function buildSignupIntent(
  legalVersions: readonly string[],
  optionalAccepted: readonly string[]
): SignupIntent {
  if (!legalVersions || legalVersions.length === 0) {
    throw new Error('Mandatory consent is required before signup');
  }
  return {
    legalVersions: [...legalVersions],
    optionalAccepted: [...optionalAccepted],
    ts: Date.now(),
  };
}

/**
 * Safe parse of the stored intent. Returns null for absent/invalid payloads —
 * a missing or malformed intent simply means "no intent captured"; it is never
 * interpreted as consent.
 */
export function parseSignupIntent(raw: string | null): SignupIntent | null {
  if (!raw) return null;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof data !== 'object' || data === null) return null;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.legalVersions) || d.legalVersions.length === 0) return null;
  if (!Array.isArray(d.optionalAccepted)) return null;
  if (typeof d.ts !== 'number' || !Number.isFinite(d.ts)) return null;
  return {
    legalVersions: d.legalVersions.map(String),
    optionalAccepted: d.optionalAccepted.map(String),
    ts: d.ts,
  };
}

/**
 * Normalize the active i18n language to the consent API closed list
 * (CLOSED_LISTS.locales: pt-BR | es-PE). Unknown languages fall back to
 * pt-BR so consent evidence always carries a valid locale.
 */
export function normalizeConsentLocale(lang: string | undefined): string {
  if (lang && lang.toLowerCase().startsWith('es')) return 'es-PE';
  return 'pt-BR';
}

/**
 * Map a captured intent + the ACTIVE legal docs to POST /api/consent bodies.
 * Mandatory: every active document whose purposes include 'service' (today:
 * terms_of_service + privacy_policy), purpose=service, granted=true.
 * Optional: only accepted ids, mapped per OPTIONAL_CONSENT_MAP.
 * idempotencyKey derives from the intent ts + doc + purpose so a retry of the
 * same intent is a true idempotent duplicate (server pre-check + unique key).
 */
export function buildConsentRequests(
  intent: SignupIntent,
  activeDocs: LegalDoc[],
  opts: { source: string; locale: string }
): ConsentRequestInput[] {
  const { source, locale } = opts;
  const requests: ConsentRequestInput[] = [];

  for (const doc of activeDocs) {
    if (!doc.purposes.includes('service')) continue;
    requests.push({
      documentType: doc.id,
      documentVersion: doc.version,
      purpose: 'service',
      legalBasis: doc.legalBases[0] ?? 'contract',
      source,
      locale,
      granted: true,
      idempotencyKey: `signup-${intent.ts}-${doc.id}-${doc.version}-service`,
    });
  }

  for (const optId of intent.optionalAccepted) {
    const mapping = OPTIONAL_CONSENT_MAP[optId];
    if (!mapping) continue;
    const doc = activeDocs.find((d) => d.id === mapping.documentType);
    if (!doc) continue;
    requests.push({
      documentType: doc.id,
      documentVersion: doc.version,
      purpose: mapping.purpose,
      legalBasis: mapping.legalBasis,
      source,
      locale,
      granted: true,
      idempotencyKey: `signup-${intent.ts}-${doc.id}-${doc.version}-${mapping.purpose}`,
    });
  }

  return requests;
}
