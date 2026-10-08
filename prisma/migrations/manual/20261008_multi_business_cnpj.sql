BEGIN;

-- Multi-business ownership + mandatory CNPJ rollout.
-- Snapshot rollback: restore Neon branch pre-multi-business-2026-10-08 / br-shy-voice-atc8qa5e.
-- Dropping these uniqueness guarantees is intentionally one-way once duplicate
-- ownerId or CNPJ values are written.

ALTER TABLE "BusinessProfile" DROP CONSTRAINT IF EXISTS "BusinessProfile_ownerId_key";
ALTER TABLE "BusinessProfile" DROP CONSTRAINT IF EXISTS businessprofile_ownerid_key;
ALTER TABLE "BusinessProfile" DROP CONSTRAINT IF EXISTS "BusinessProfile_cnpj_key";
DROP INDEX IF EXISTS businessprofile_ownerid_key;
DROP INDEX IF EXISTS "BusinessProfile_ownerId_key";
DROP INDEX IF EXISTS "BusinessProfile_cnpj_key";

CREATE INDEX IF NOT EXISTS idx_businessprofile_ownerid ON "BusinessProfile" ("ownerId");
CREATE INDEX IF NOT EXISTS idx_businessprofile_cnpj ON "BusinessProfile" (cnpj);

-- Existing legacy rows may still be missing CNPJ. New writes are validated in
-- the app layer so old rows remain manageable until cleaned up manually.

COMMIT;
