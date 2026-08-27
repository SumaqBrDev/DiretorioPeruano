-- prisma/cleanup_production.sql
-- ============================================================================
-- TEST-DATA CLEANUP DRY RUN REPORT — DiretorioPeruano (ConectaPeru)
-- ============================================================================
-- Purpose: produce a read-only report for classified test data and fail closed
-- in the operator contract when required invariants are not satisfied.
--
-- Backup gate:
--   1. Take a fresh Neon branch, snapshot, or pg_dump before any later
--      destructive phase.
--   2. Re-run this dry run immediately before that later phase and compare the
--      protected ids, candidate ids, and table counts.
--   3. If status is BLOCKED, stop. Re-run classification or investigate drift.
-- ============================================================================

WITH protected_user AS (
  SELECT id, email, "dataClassification"
  FROM "User"
  WHERE email = 'jarhkof.apps@gmail.com'
), protected_user_count AS (
  SELECT COUNT(*)::int AS count
  FROM protected_user
), candidate_users AS (
  SELECT id, email, "dataClassification"
  FROM "User"
  WHERE "dataClassification" = 'test'
), protected_candidate_overlap AS (
  SELECT c.id
  FROM candidate_users AS c
  INNER JOIN protected_user AS p ON p.id = c.id
), candidate_businesses AS (
  SELECT b.id, b."ownerId", b."dataClassification"
  FROM "BusinessProfile" AS b
  LEFT JOIN "User" AS u ON u.id = b."ownerId"
  WHERE b."dataClassification" = 'test'
     OR (b."ownerId" IS NOT NULL AND u."dataClassification" = 'test')
), ownerless_test_businesses AS (
  SELECT b.id
  FROM "BusinessProfile" AS b
  WHERE b."ownerId" IS NULL AND b."dataClassification" = 'test'
), blocked_reasons AS (
  SELECT 'protected user count must equal 1' AS reason
  FROM protected_user_count
  WHERE count <> 1
  UNION ALL
  SELECT 'protected user must stay classified real' AS reason
  FROM protected_user
  WHERE "dataClassification" <> 'real'
  UNION ALL
  SELECT 'protected user appears in candidate set' AS reason
  FROM protected_candidate_overlap
  UNION ALL
  SELECT 'ownerless test businesses block cleanup' AS reason
  FROM ownerless_test_businesses
), dependent_counts AS (
  SELECT 'BusinessAd' AS table_name, COUNT(*)::bigint AS candidate_count
  FROM "BusinessAd"
  WHERE "businessId" IN (SELECT id FROM candidate_businesses)
  UNION ALL
  SELECT 'Review', COUNT(*)::bigint
  FROM "Review"
  WHERE "businessId" IN (SELECT id FROM candidate_businesses)
     OR "consumerId" IN (SELECT id FROM candidate_users)
  UNION ALL
  SELECT 'Message', COUNT(*)::bigint
  FROM "Message"
  WHERE "fromBusinessId" IN (SELECT id FROM candidate_businesses)
     OR "toBusinessId" IN (SELECT id FROM candidate_businesses)
  UNION ALL
  SELECT 'CommunityTopic', COUNT(*)::bigint
  FROM "CommunityTopic"
  WHERE "authorId" IN (SELECT id FROM candidate_users)
  UNION ALL
  SELECT 'CommunityPost', COUNT(*)::bigint
  FROM "CommunityPost"
  WHERE "authorId" IN (SELECT id FROM candidate_users)
     OR "topicId" IN (SELECT id FROM "CommunityTopic" WHERE "authorId" IN (SELECT id FROM candidate_users))
  UNION ALL
  SELECT 'CommunityVote', COUNT(*)::bigint
  FROM "CommunityVote"
  WHERE "userId" IN (SELECT id FROM candidate_users)
  UNION ALL
  SELECT 'ConsentRecord', COUNT(*)::bigint
  FROM "ConsentRecord"
  WHERE "userId" IN (SELECT id FROM candidate_users)
  UNION ALL
  SELECT 'CookiePreference', COUNT(*)::bigint
  FROM "CookiePreference"
  WHERE "userId" IN (SELECT id FROM candidate_users)
)
SELECT
  'summary' AS section,
  CASE WHEN EXISTS (SELECT 1 FROM blocked_reasons) THEN 'BLOCKED' ELSE 'READY_FOR_BACKUP_CONFIRMED_DESTRUCTIVE_PHASE' END AS status,
  (SELECT count FROM protected_user_count)::text AS detail_a,
  COALESCE((SELECT string_agg(id::text, ', ' ORDER BY id) FROM protected_user), '(none)') AS detail_b,
  COALESCE((SELECT string_agg(reason, ' | ' ORDER BY reason) FROM blocked_reasons), 'none') AS detail_c
UNION ALL
SELECT
  'protected_user',
  'report',
  COALESCE(email, '(null)'),
  id::text,
  "dataClassification"
FROM protected_user
UNION ALL
SELECT
  'candidate_user',
  'report',
  COALESCE(email, '(null)'),
  id::text,
  "dataClassification"
FROM candidate_users
UNION ALL
SELECT
  'candidate_business',
  'report',
  id::text,
  COALESCE("ownerId"::text, '(ownerless)'),
  "dataClassification"
FROM candidate_businesses
UNION ALL
SELECT
  'dependent_count',
  'report',
  table_name,
  candidate_count::text,
  'classified dependency count'
FROM dependent_counts
UNION ALL
SELECT
  'excluded',
  'report',
  'WebhookEvent',
  COUNT(*)::text,
  'WebhookEvent excluded from v1 candidate set because it has no deterministic classified root ownership path'
FROM "WebhookEvent"
UNION ALL
SELECT
  'instructions',
  'report',
  'backup confirmation required',
  'rerun this dry run before any later destructive phase',
  'compare protected ids, candidate ids, ownerless rows, and dependent counts; if anything drifts, stop'
;