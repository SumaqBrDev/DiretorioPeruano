-- Ad moderation + community advertisers
-- =====================================================================
-- Context: ads were welded to an approved business WITH an active
-- subscription. Two changes:
--   1. Any confirmed account may advertise (business OR community user), so
--      businessId becomes nullable and userId is added.
--   2. Ads are moderated before publication, with a bounded number of
--      correction attempts and an auditable reason for every rejection.
--
-- Safety: additive only. No column is dropped, no row is deleted, no
-- existing status value is rewritten. Pre-existing ads keep their
-- businessId and simply carry NULL in the new columns.
--
-- Idempotent: every statement uses IF NOT EXISTS / IF EXISTS, so re-running
-- this file is harmless.
--
-- Run:  psql "<CONNECTION_STRING>" -f prisma/migrations/manual/20261008_ad_moderation.sql

BEGIN;

-- 1. businessId becomes optional (community ads have no business).
ALTER TABLE "BusinessAd" ALTER COLUMN "businessId" DROP NOT NULL;

-- 2. Purchaser of the ad.
ALTER TABLE "BusinessAd" ADD COLUMN IF NOT EXISTS "userId" TEXT;

-- 3. Moderation trail. A rejection ALWAYS records its reason: a block with no
--    stated motive reads as a system error rather than a decision.
ALTER TABLE "BusinessAd" ADD COLUMN IF NOT EXISTS "moderationReason" TEXT;
ALTER TABLE "BusinessAd" ADD COLUMN IF NOT EXISTS "reviewAttempts" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "BusinessAd" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "BusinessAd" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;

-- 4. Which version of the publication terms was accepted, and when. Stored so
--    a dispute can be answered with the exact text the advertiser was shown.
ALTER TABLE "BusinessAd" ADD COLUMN IF NOT EXISTS "termsVersion" TEXT;
ALTER TABLE "BusinessAd" ADD COLUMN IF NOT EXISTS "termsAcceptedAt" TIMESTAMP(3);

-- 5. Refund timestamp. A never-published ad that exhausts its attempts is
--    refunded (CDC art. 51, II voids no-refund clauses for an unperformed
--    service), so the refund needs its own auditable mark.
ALTER TABLE "BusinessAd" ADD COLUMN IF NOT EXISTS "refundedAt" TIMESTAMP(3);

-- 6. Foreign key to the purchaser. SET NULL, not CASCADE: anonymising a
--    deleted owner must not erase the ad's financial record.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BusinessAd_userId_fkey'
  ) THEN
    ALTER TABLE "BusinessAd"
      ADD CONSTRAINT "BusinessAd_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- 7. Index for "my ads" lookups.
CREATE INDEX IF NOT EXISTS "BusinessAd_userId_idx" ON "BusinessAd"("userId");

-- 8. Backfill userId for existing ads from their business owner, so historical
--    rows are attributable too. Only fills NULLs; never overwrites.
UPDATE "BusinessAd" a
SET "userId" = b."ownerId"
FROM "BusinessProfile" b
WHERE a."businessId" = b."id"
  AND a."userId" IS NULL;

COMMIT;

-- Verification (run after COMMIT):
--   SELECT column_name, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'BusinessAd'
--      AND column_name IN ('businessId','userId','moderationReason',
--                          'reviewAttempts','termsVersion','refundedAt')
--    ORDER BY column_name;
--
--   -- every existing ad should now have a purchaser:
--   SELECT count(*) AS ads_without_user FROM "BusinessAd" WHERE "userId" IS NULL;
