-- prisma/upgrade_intent_migration.sql
-- Adds the business upgrade intent marker to User.
-- MANUAL, IDEMPOTENT migration (the repo never uses `prisma migrate`).
--
-- ROLLBACK (documentation only):
--   ALTER TABLE "User" DROP COLUMN IF EXISTS "businessIntentAt";

ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "businessIntentAt" TIMESTAMP;
