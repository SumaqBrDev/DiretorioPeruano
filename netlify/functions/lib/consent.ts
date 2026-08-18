// netlify/functions/lib/consent.ts
// LGPD consent core library (design D1–D5; WU2a task 2.2).
//
// Pure server-side consent logic: closed-list validation, user provisioning
// by clerkId, append-only grant/revoke evidence with idempotency, the
// fail-closed re-consent gate (admin/superadmin exempt), current-consent
// resolution and the own-data export builder.
//
// The Prisma client is INJECTED via `deps` (repo convention: core tests use
// an injected mocked Prisma; handlers pass the real client). This module
// never imports `./prisma`, so importing it in unit tests does not construct
// a DB adapter.
//
// Legal registry comes from `src/config/legal.ts` (single source, D1):
// versions and hashes recorded are ALWAYS server-derived from the ACTIVE
// document, so a superseded or future-dated version can never be recorded.
// IP/userAgent are intentionally NOT captured (D5 — no justification/retention).

import { CLOSED_LISTS, getLegalDoc, activeLegalDocs } from '../../../src/config/legal';

// ── Structural Prisma surface (narrow, mock-friendly) ──────────────────────
export interface ConsentPrisma {
  user: {
    upsert: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
  };
  consentRecord: {
    findFirst: (args: any) => Promise<any>;
    findMany: (args: any) => Promise<any>;
    create: (args: any) => Promise<any>;
  };
  cookiePreference?: {
    findMany?: (args: any) => Promise<any>;
  };
}

export interface ConsentDeps {
  prisma: ConsentPrisma;
}

// ── Closed-list validation (consent-api: "MUST validate purpose, legalBasis,
//    source, and locale against closed lists") ───────────────────────────────
export interface ClosedListInput {
  documentType?: string;
  purpose?: string;
  legalBasis?: string;
  source?: string;
  locale?: string;
  intent?: string;
}

export type ValidationResult = { ok: true } | { ok: false; errors: string[] };

const CLOSED_LIST_FIELDS: Array<[keyof ClosedListInput, readonly string[]]> = [
  ['documentType', CLOSED_LISTS.documentTypes as readonly string[]],
  ['purpose', CLOSED_LISTS.purposes as readonly string[]],
  ['legalBasis', CLOSED_LISTS.legalBases as readonly string[]],
  ['source', CLOSED_LISTS.sources as readonly string[]],
  ['locale', CLOSED_LISTS.locales as readonly string[]],
  ['intent', CLOSED_LISTS.intents as readonly string[]],
];

/** Validates the fields present against CLOSED_LISTS; unknown values are rejected. */
export function validateClosedLists(input: ClosedListInput): ValidationResult {
  const errors: string[] = [];
  for (const [field, allowed] of CLOSED_LIST_FIELDS) {
    const value = input[field];
    if (value === undefined) continue;
    if (!allowed.includes(value)) errors.push(`${field} '${value}' is not allowed`);
  }
  return errors.length ? { ok: false, errors } : { ok: true };
}

// ── User provisioning (D4: upsert by clerkId from verified claims) ──────────
export interface ClerkClaims {
  email?: string | null;
  name?: string | null;
  [key: string]: unknown;
}

/**
 * Upsert a user row keyed by the verified Clerk id (server-derived subject).
 * Called by consent flows on the first authenticated operation; idempotent —
 * an existing user is updated, never duplicated.
 */
export async function ensureUserByClerkId(
  clerkId: string,
  claims: ClerkClaims,
  deps: ConsentDeps
): Promise<any> {
  const data: { email?: string | null; name?: string | null } = {};
  if (claims.email !== undefined) data.email = claims.email;
  if (claims.name !== undefined) data.name = claims.name;
  return deps.prisma.user.upsert({
    where: { clerkId },
    update: data,
    create: { clerkId, ...data },
  });
}

// ── Shared append logic ─────────────────────────────────────────────────────
async function findByIdempotency(
  deps: ConsentDeps,
  userId: string,
  idempotencyKey: string
): Promise<any> {
  return deps.prisma.consentRecord.findFirst({
    where: { userId, idempotencyKey },
  });
}

async function appendRow(
  deps: ConsentDeps,
  data: Record<string, unknown>,
  userId: string,
  idempotencyKey: string
): Promise<{ record: any; duplicate: boolean }> {
  try {
    const record = await deps.prisma.consentRecord.create({ data });
    return { record, duplicate: false };
  } catch (err: any) {
    // P2002 (unique (userId, idempotencyKey)): a concurrent identical submit
    // won the race — the pre-check lost, the unique key backstops (D2).
    if (err?.code === 'P2002') {
      const existing = await findByIdempotency(deps, userId, idempotencyKey);
      if (existing) return { record: existing, duplicate: true };
    }
    throw err;
  }
}

// ── recordConsent (grant only — revokes go through revokeConsent) ───────────
export interface RecordConsentInput {
  userId: string;
  documentType: string;
  /** Optional: must equal the ACTIVE registry version; server-derived when omitted. */
  documentVersion?: string;
  purpose: string;
  legalBasis: string;
  source: string;
  locale: string;
  granted?: boolean;
  idempotencyKey: string;
}

export type RecordConsentResult =
  | { ok: true; record: any; duplicate: boolean }
  | { ok: false; code: 'INVALID_PAYLOAD'; errors: string[] };

/**
 * Records an append-only GRANT row for the ACTIVE document version (version
 * and hash always server-derived from the registry — a superseded or
 * future-dated version is rejected so no stale evidence is ever recorded).
 *
 * Idempotency (D2): logical pre-check by (userId, idempotencyKey) plus the DB
 * unique key as a race backstop — an exact duplicate submit returns
 * `duplicate: true` (HTTP 200 upstream) instead of a second row.
 */
export async function recordConsent(
  input: RecordConsentInput,
  deps: ConsentDeps,
  now: Date = new Date()
): Promise<RecordConsentResult> {
  const listCheck = validateClosedLists({
    documentType: input.documentType,
    purpose: input.purpose,
    legalBasis: input.legalBasis,
    source: input.source,
    locale: input.locale,
    intent: 'grant',
  });
  if (listCheck.ok !== true) return { ok: false, code: 'INVALID_PAYLOAD', errors: listCheck.errors };

  // The record endpoint is grants-only; revocations have their own rules.
  if ((input.granted ?? true) !== true) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      errors: ["granted=false is not allowed via recordConsent; use revokeConsent"],
    };
  }

  const doc = getLegalDoc(input.documentType, now);
  if (!doc) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      errors: [`Unknown or inactive document: ${input.documentType}`],
    };
  }

  if (!doc.purposes.includes(input.purpose)) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      errors: [`purpose '${input.purpose}' is not applicable to ${doc.id}`],
    };
  }

  const version = input.documentVersion ?? doc.version;
  if (version !== doc.version) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      errors: [`documentVersion '${version}' is not the active version '${doc.version}' of ${doc.id}`],
    };
  }

  const existing = await findByIdempotency(deps, input.userId, input.idempotencyKey);
  if (existing) return { ok: true, record: existing, duplicate: true };

  const { record, duplicate } = await appendRow(
    deps,
    {
      userId: input.userId,
      documentType: doc.id,
      documentVersion: doc.version,
      documentHash: doc.hash,
      purpose: input.purpose,
      legalBasis: input.legalBasis,
      intent: 'grant',
      granted: true,
      consentedAt: now,
      revokedAt: null,
      source: input.source,
      locale: input.locale,
      idempotencyKey: input.idempotencyKey,
    },
    input.userId,
    input.idempotencyKey
  );
  return { ok: true, record, duplicate };
}

// ── revokeConsent (optional only — mandatory service consent is not
//    revocable while the account is active) ──────────────────────────────────
export interface RevokeConsentInput {
  userId: string;
  documentType: string;
  purpose: string;
  idempotencyKey: string;
  source?: string;
  locale?: string;
}

export type RevokeConsentResult =
  | { ok: true; record: any; duplicate: boolean }
  | { ok: false; code: 'INVALID_PAYLOAD' | 'DOCUMENT_NOT_FOUND' | 'MANDATORY_NOT_REVOCABLE'; errors: string[] };

/**
 * Appends a granted=false row for an OPTIONAL consent (purpose != service).
 * Mandatory service-contract consents (terms_of_service / privacy_policy,
 * purpose=service) are rejected with MANDATORY_NOT_REVOCABLE while the
 * account is active (spec: consent-rights-preferences/Revocation channel).
 */
export async function revokeConsent(
  input: RevokeConsentInput,
  deps: ConsentDeps,
  now: Date = new Date()
): Promise<RevokeConsentResult> {
  const source = input.source ?? 'settings';
  const locale = input.locale ?? 'pt-BR';

  // Revoke contract (design): unknown/inactive document ⇒ 404 DOCUMENT_NOT_FOUND.
  // Registry resolution comes FIRST so a document absent from the registry gets
  // the specific 404 (recordConsent, by contrast, validates closed lists first
  // and maps unknown docs to 422 INVALID_PAYLOAD).
  const doc = getLegalDoc(input.documentType, now);
  if (!doc) {
    return { ok: false, code: 'DOCUMENT_NOT_FOUND', errors: [`Unknown or inactive document: ${input.documentType}`] };
  }

  const listCheck = validateClosedLists({
    documentType: input.documentType,
    purpose: input.purpose,
    intent: 'revoke',
    source,
    locale,
  });
  if (listCheck.ok !== true) return { ok: false, code: 'INVALID_PAYLOAD', errors: listCheck.errors };

  if (!doc.purposes.includes(input.purpose)) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      errors: [`purpose '${input.purpose}' is not applicable to ${doc.id}`],
    };
  }

  if (input.purpose === 'service') {
    return {
      ok: false,
      code: 'MANDATORY_NOT_REVOCABLE',
      errors: ['Mandatory service-contract consent cannot be revoked while the account is active'],
    };
  }

  const existing = await findByIdempotency(deps, input.userId, input.idempotencyKey);
  if (existing) return { ok: true, record: existing, duplicate: true };

  const { record, duplicate } = await appendRow(
    deps,
    {
      userId: input.userId,
      documentType: doc.id,
      documentVersion: doc.version,
      documentHash: doc.hash,
      purpose: input.purpose,
      legalBasis: doc.legalBases[0] ?? 'consent',
      intent: 'revoke',
      granted: false,
      consentedAt: now,
      revokedAt: now,
      source,
      locale,
      idempotencyKey: input.idempotencyKey,
    },
    input.userId,
    input.idempotencyKey
  );
  return { ok: true, record, duplicate };
}

// ── Re-consent gate (D3: fail-closed; admin/superadmin exempt) ──────────────
export type GateResult =
  | { ok: true }
  | { ok: false; code: 'CONSENT_REQUIRED'; requiredDocs: string[] };

function latestFor(records: any[], documentType: string, purpose: string): any {
  const matching = records.filter((r) => r.documentType === documentType && r.purpose === purpose);
  if (!matching.length) return undefined;
  return sortRecordsNewestFirst(matching)[0];
}

/**
 * Fail-closed re-consent gate (D3): latest row per (userId, documentType,
 * purpose=service) must be granted=true with the ACTIVE version. A missing
 * user row ⇒ CONSENT_REQUIRED (fail-closed). admin/superadmin are exempt.
 * Consumers (businesses.ts POST, WU2b) map ok:false → 409 CONSENT_REQUIRED.
 */
export async function assertCurrentMandatoryConsent(
  userId: string,
  deps: ConsentDeps,
  now: Date = new Date()
): Promise<GateResult> {
  const user = await deps.prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    return { ok: false, code: 'CONSENT_REQUIRED', requiredDocs: mandatoryServiceDocIds(now) };
  }
  if (user.role === 'admin' || user.role === 'superadmin') return { ok: true };

  const records = await deps.prisma.consentRecord.findMany({ where: { userId } });
  const requiredDocs: string[] = [];
  for (const doc of activeLegalDocs(now)) {
    if (!doc.purposes.includes('service')) continue;
    const latest = latestFor(records, doc.id, 'service');
    if (!latest || latest.granted !== true || latest.documentVersion !== doc.version) {
      requiredDocs.push(doc.id);
    }
  }
  return requiredDocs.length
    ? { ok: false, code: 'CONSENT_REQUIRED', requiredDocs }
    : { ok: true };
}

function mandatoryServiceDocIds(now: Date): string[] {
  return activeLegalDocs(now)
    .filter((d) => d.purposes.includes('service'))
    .map((d) => d.id);
}

// ── Current consent resolution ──────────────────────────────────────────────
function sortRecordsNewestFirst(records: any[]): any[] {
  return [...records].sort((a, b) => {
    const aTime = new Date(a.createdAt ?? a.consentedAt).getTime();
    const bTime = new Date(b.createdAt ?? b.consentedAt).getTime();
    if (aTime !== bTime) return bTime - aTime;
    const aConsented = new Date(a.consentedAt ?? 0).getTime();
    const bConsented = new Date(b.consentedAt ?? 0).getTime();
    if (aConsented !== bConsented) return bConsented - aConsented;
    return String(b.id ?? '').localeCompare(String(a.id ?? ''));
  });
}

export interface CurrentConsent {
  id: string;
  documentType: string;
  documentVersion: string;
  documentHash: string;
  purpose: string;
  legalBasis: string;
  intent: string;
  granted: boolean;
  consentedAt: Date;
  revokedAt: Date | null;
  source: string;
  locale: string;
  idempotencyKey: string;
  createdAt: Date;
}

/**
 * Latest row per (documentType, purpose) — current consent per key, newest
 * first overall (spec: "latest row per key is current consent").
 */
export async function resolveCurrentConsents(
  userId: string,
  deps: ConsentDeps
): Promise<CurrentConsent[]> {
  const records = await deps.prisma.consentRecord.findMany({ where: { userId } });
  const sorted = sortRecordsNewestFirst(records);

  const latestByKey = new Map<string, any>();
  for (const r of sorted) {
    const key = `${r.documentType}\u0000${r.purpose}`;
    if (!latestByKey.has(key)) latestByKey.set(key, r);
  }

  return Array.from(latestByKey.values()).map((r) => ({
    id: r.id,
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
}

// ── Export builder (spec: consent-rights-preferences/Export channel) ────────
// Own data only: profile id/email/name + consent history + cookie
// preferences. Fields are PICKED so internal/other-user/secrets can never
// leak (no password hashes exist on User; no userId is re-emitted).

export interface ExportPayload {
  profile: { id: string; email: string | null; name: string | null };
  consents: Array<{
    id: string;
    documentType: string;
    documentVersion: string;
    documentHash: string;
    purpose: string;
    legalBasis: string;
    intent: string;
    granted: boolean;
    consentedAt: Date;
    revokedAt: Date | null;
    source: string;
    locale: string;
    idempotencyKey: string;
    createdAt: Date;
  }>;
  cookiePreferences: Array<{
    policyVersion: string;
    categories: unknown;
    locale: string;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

export function buildExport(args: {
  user: any;
  consents: any[];
  cookiePreferences?: any[];
}): ExportPayload {
  const { user, consents = [], cookiePreferences = [] } = args;
  return {
    profile: { id: user.id, email: user.email ?? null, name: user.name ?? null },
    consents: consents.map((c) => ({
      id: c.id,
      documentType: c.documentType,
      documentVersion: c.documentVersion,
      documentHash: c.documentHash,
      purpose: c.purpose,
      legalBasis: c.legalBasis,
      intent: c.intent,
      granted: c.granted,
      consentedAt: c.consentedAt,
      revokedAt: c.revokedAt ?? null,
      source: c.source,
      locale: c.locale,
      idempotencyKey: c.idempotencyKey,
      createdAt: c.createdAt,
    })),
    cookiePreferences: cookiePreferences.map((p) => ({
      policyVersion: p.policyVersion,
      categories: p.categories,
      locale: p.locale,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    })),
  };
}
