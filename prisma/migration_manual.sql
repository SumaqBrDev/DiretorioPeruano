-- Add new columns to BusinessProfile
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS cnpj VARCHAR(18) UNIQUE;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "ownerFullName" VARCHAR(255);
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "ownerBirthCity" VARCHAR(255);
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'PENDING';
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "stripeCustomerId" VARCHAR(255);
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "subscriptionId" VARCHAR(255);
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "subscriptionStatus" VARCHAR(50);
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "trialEndsAt" TIMESTAMP;
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "disabledAt" TIMESTAMP;

-- Add status to Review
ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'approved';
ALTER TABLE "Review" ALTER COLUMN status SET DEFAULT 'approved';

-- Average rating on BusinessProfile (minRating filter)
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS rating DOUBLE PRECISION;

-- WebhookEvent table for Stripe webhook idempotency (no Redis)
CREATE TABLE IF NOT EXISTS "WebhookEvent" (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "stripeEventId" TEXT UNIQUE,
  type TEXT,
  payload JSONB,
  "processedAt" TIMESTAMP,
  "createdAt" TIMESTAMP DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_event_type ON "WebhookEvent"(type);

-- Create SiteConfig table for beta mode
CREATE TABLE IF NOT EXISTS "SiteConfig" (
  id VARCHAR(50) PRIMARY KEY DEFAULT 'singleton',
  "betaMode" BOOLEAN DEFAULT true,
  "updatedAt" TIMESTAMP DEFAULT now()
);

-- Insert default config
INSERT INTO "SiteConfig" (id, "betaMode") VALUES ('singleton', true)
ON CONFLICT (id) DO NOTHING;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_business_status ON "BusinessProfile"(status);
CREATE INDEX IF NOT EXISTS idx_business_approved_at ON "BusinessProfile"("approvedAt");
CREATE INDEX IF NOT EXISTS idx_review_business ON "Review"("businessId");

-- Review hard rules (BUG-010/BUG-011): one review per consumer per business.
DELETE FROM "Review" r USING (
  SELECT "consumerId", "businessId", MAX(id) AS keep_id
  FROM "Review" GROUP BY "consumerId", "businessId" HAVING COUNT(*) > 1
) d
WHERE r."consumerId" = d."consumerId" AND r."businessId" = d."businessId" AND r.id <> d.keep_id;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'review_consumer_business_unique') THEN
    ALTER TABLE "Review" ADD CONSTRAINT review_consumer_business_unique UNIQUE ("consumerId", "businessId");
  END IF;
END $$;

-- BUG-019 schema drift: Message table was missing archived/deletedAt columns.
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- BUG-025 schema drift: BusinessProfile.ownerId is @unique in Prisma but the
-- column lacked the constraint, letting one user own multiple businesses
-- (broke my-business resolution). Dedupe QA artifacts, then constrain.
-- (Postgres UNIQUE allows multiple NULLs, so ownerless rows are fine.)
ALTER TABLE "BusinessProfile" ADD CONSTRAINT businessprofile_ownerid_key UNIQUE ("ownerId");

-- test-data-lifecycle: explicit root classification with database defaults.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dataClassification" TEXT NOT NULL DEFAULT 'real';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "dataClassifiedAt" TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "dataClassification" TEXT NOT NULL DEFAULT 'real';
ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS "dataClassifiedAt" TIMESTAMP NOT NULL DEFAULT now();
ALTER TABLE "User" ALTER COLUMN "dataClassification" SET DEFAULT 'real';
ALTER TABLE "User" ALTER COLUMN "dataClassifiedAt" SET DEFAULT now();
ALTER TABLE "BusinessProfile" ALTER COLUMN "dataClassification" SET DEFAULT 'real';
ALTER TABLE "BusinessProfile" ALTER COLUMN "dataClassifiedAt" SET DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_user_data_classification ON "User"("dataClassification");
CREATE INDEX IF NOT EXISTS idx_businessprofile_data_classification ON "BusinessProfile"("dataClassification");

-- Fail closed unless the exact protected identity resolves to exactly one user.
WITH protected_user AS (
  SELECT id
  FROM "User"
  WHERE email = 'jarhkof.apps@gmail.com'
), protected_user_count AS (
  SELECT COUNT(*)::int AS count
  FROM protected_user
), protected_user_guard AS (
  SELECT CASE WHEN count = 1 THEN 1 ELSE 1 / 0 END AS ok
  FROM protected_user_count
)
UPDATE "User" AS u
SET "dataClassification" = CASE
      WHEN u.email = 'jarhkof.apps@gmail.com' THEN 'real'
      ELSE 'test'
    END,
    "dataClassifiedAt" = COALESCE(u."dataClassifiedAt", now())
FROM protected_user_guard
WHERE u."dataClassification" IS DISTINCT FROM CASE
        WHEN u.email = 'jarhkof.apps@gmail.com' THEN 'real'
        ELSE 'test'
      END
   OR u."dataClassifiedAt" IS NULL;

-- Backfill businesses from owner classification; ownerless rows stay real for manual review.
WITH protected_user AS (
  SELECT id
  FROM "User"
  WHERE email = 'jarhkof.apps@gmail.com'
), protected_user_count AS (
  SELECT COUNT(*)::int AS count
  FROM protected_user
), protected_user_guard AS (
  SELECT CASE WHEN count = 1 THEN 1 ELSE 1 / 0 END AS ok
  FROM protected_user_count
)
UPDATE "BusinessProfile" AS b
SET "dataClassification" = u."dataClassification",
    "dataClassifiedAt" = COALESCE(b."dataClassifiedAt", now())
FROM "User" AS u, protected_user_guard
WHERE b."ownerId" = u.id
  AND (
    b."dataClassification" IS DISTINCT FROM u."dataClassification"
    OR b."dataClassifiedAt" IS NULL
  );

-- ownerless test businesses block cleanup and require manual review before any later destructive phase.
WITH ownerless_test_businesses AS (
  SELECT b.id
  FROM "BusinessProfile" AS b
  WHERE b."ownerId" IS NULL AND b."dataClassification" = 'test'
)
SELECT COUNT(*)
FROM ownerless_test_businesses;
