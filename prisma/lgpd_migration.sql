-- prisma/lgpd_migration.sql
-- LGPD consent governance tables (DiretorioPeruano / ConectaPeru).
--
-- MANUAL, IDEMPOTENT migration — re-runnable without error or duplicate
-- objects (AC: Manual idempotent migration / Migration re-run). Quoted
-- camelCase column/table names matching the repo convention (see
-- prisma/migration_manual.sql). `prisma migrate` is NEVER used in production.
--
-- Append-only evidence: ConsentRecord rows are INSERT-only (grants AND
-- revocations append new rows; current consent = latest row per key).
-- CookiePreference is current UI state (upsert per user), not evidence.
--
-- ── ROLLBACK (documentation only — never executed by this migration) ────────
-- DROP TABLE IF EXISTS "CookiePreference";
-- DROP TABLE IF EXISTS "ConsentRecord";
--
-- Apply via the existing run-migration pattern:
--   node run-migration.cjs   (edit the SQL path if needed)

-- Consent evidence (append-only). userId references the existing User table.
CREATE TABLE IF NOT EXISTS "ConsentRecord" (
  id               TEXT      PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"         TEXT      NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
  "documentType"   TEXT      NOT NULL,  -- terms_of_service | privacy_policy | cookie_policy
  "documentVersion" TEXT     NOT NULL,
  "documentHash"   TEXT      NOT NULL,
  purpose          TEXT      NOT NULL,  -- service | marketing | analytics
  "legalBasis"     TEXT      NOT NULL,  -- contract | consent | legitimate_interest
  intent           TEXT      NOT NULL,  -- grant | revoke
  granted          BOOLEAN   NOT NULL,
  "consentedAt"    TIMESTAMP NOT NULL DEFAULT now(),
  "revokedAt"      TIMESTAMP,
  source           TEXT      NOT NULL,  -- signup | onboarding | reconsent | settings | import
  locale           TEXT      NOT NULL,
  "idempotencyKey" TEXT      NOT NULL,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT now()
);

-- Idempotency: exact duplicate submits collide here (D2: client-supplied
-- idempotencyKey + logical pre-check; race backstop).
CREATE UNIQUE INDEX IF NOT EXISTS consentrecord_user_idem_key
  ON "ConsentRecord"("userId", "idempotencyKey");

-- Lookup indexes (per-user history by doc+purpose; per-doc version scans).
CREATE INDEX IF NOT EXISTS idx_consent_user_doc_purpose
  ON "ConsentRecord"("userId", "documentType", purpose);
CREATE INDEX IF NOT EXISTS idx_consent_doc_version
  ON "ConsentRecord"("documentType", "documentVersion");

-- Cookie preferences (current UI state — one row per user, upsert).
CREATE TABLE IF NOT EXISTS "CookiePreference" (
  id             TEXT      PRIMARY KEY DEFAULT gen_random_uuid(),
  "userId"       TEXT      NOT NULL UNIQUE REFERENCES "User"(id) ON DELETE CASCADE,
  "policyVersion" TEXT     NOT NULL,
  categories     JSONB     NOT NULL,  -- { analytics: bool, marketing: bool }
  locale         TEXT      NOT NULL DEFAULT 'pt-BR',
  "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT now()
);
