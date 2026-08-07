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
-- NOTE: base columns created by apply_schema.sql are UNQUOTED, so Postgres stores
-- them lowercased (businessid, consumerid, ownerid, createdat, updatedat).
CREATE INDEX IF NOT EXISTS idx_review_business ON "Review"(businessid);