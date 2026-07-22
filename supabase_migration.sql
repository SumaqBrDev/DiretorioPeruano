-- Add archived and deletedAt columns to Message table
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false;
ALTER TABLE "Message" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP;

-- Clean up old messages (older than 30 days and marked as deleted)
DELETE FROM "Message" WHERE "deletedAt" IS NOT NULL AND "deletedAt" < NOW() - INTERVAL '30 days';
