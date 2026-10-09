BEGIN;

-- Backfill for commit 5d65df4 (feat(business-hours): add schema field and
-- shared validation lib) which added `hours Json?` to the BusinessProfile
-- Prisma model but never shipped the corresponding SQL migration. Production
-- (Neon) was missing the column, causing every GET /businesses call to fail
-- with Prisma P2022 "column BusinessProfile.hours does not exist".
--
-- Applied directly against Neon ep-long-poetry-atbuzl1z on 2026-10-09 via
-- scripts/apply-hours-column.mjs (no DATABASE_URL in local env, so applied
-- through `netlify dev:exec`). This file documents the change and makes any
-- future environment (staging, DR restore) idempotently reach the same state.

ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS hours JSONB;

COMMIT;
