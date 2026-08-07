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
-- Align the default on existing databases (ADD COLUMN IF NOT EXISTS is a no-op there)
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
-- Column names are canonical camelCase (apply_schema.sql quotes identifiers)
CREATE INDEX IF NOT EXISTS idx_review_business ON "Review"("businessId");
-- Review hard rules (BUG-010/BUG-011): one review per consumer per business.
-- Dedupe existing data first (keep one review per consumer+business; id as
-- tiebreaker because now() is constant within a transaction, so createdAt
-- ties are common).
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
