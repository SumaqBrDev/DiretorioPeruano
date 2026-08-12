-- community_migration.sql
-- Feature "Comunidad" (ConectaPeru) — foro estilo Reddit/Yahoo Answers.
-- Modelos: CommunityTopic, CommunityPost (árbol TikTok: parentId como
-- referencia de respuesta, un solo nivel de indentación), CommunityVote
-- (targetType 'topic'|'post' para votos en temas Y respuestas).
--
-- Idempotente: cada objeto se crea solo si no existe (DO blocks + IF NOT EXISTS).

-- ── CommunityTopic ────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityTopic_pkey') THEN
    CREATE TABLE "CommunityTopic" (
      "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "title"      TEXT NOT NULL,
      "body"       TEXT NOT NULL,
      "authorId"   TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "status"     TEXT NOT NULL DEFAULT 'visible',  -- visible, hidden, deleted
      "reported"   BOOLEAN NOT NULL DEFAULT false,
      "viewCount"  INTEGER NOT NULL DEFAULT 0,
      "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityTopic_status_idx') THEN
    CREATE INDEX "CommunityTopic_status_idx" ON "CommunityTopic"("status");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityTopic_createdAt_idx') THEN
    CREATE INDEX "CommunityTopic_createdAt_idx" ON "CommunityTopic"("createdAt");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityTopic_authorId_idx') THEN
    CREATE INDEX "CommunityTopic_authorId_idx" ON "CommunityTopic"("authorId");
  END IF;
END $$;

-- ── CommunityPost ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityPost_pkey') THEN
    CREATE TABLE "CommunityPost" (
      "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "topicId"    TEXT NOT NULL REFERENCES "CommunityTopic"("id") ON DELETE CASCADE,
      "parentId"   TEXT REFERENCES "CommunityPost"("id") ON DELETE CASCADE,
      "authorId"   TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "body"       TEXT NOT NULL,
      "status"     TEXT NOT NULL DEFAULT 'visible',  -- visible, hidden, deleted
      "reported"   BOOLEAN NOT NULL DEFAULT false,
      "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now(),
      "updatedAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityPost_topicId_idx') THEN
    CREATE INDEX "CommunityPost_topicId_idx" ON "CommunityPost"("topicId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityPost_parentId_idx') THEN
    CREATE INDEX "CommunityPost_parentId_idx" ON "CommunityPost"("parentId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityPost_authorId_idx') THEN
    CREATE INDEX "CommunityPost_authorId_idx" ON "CommunityPost"("authorId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityPost_status_idx') THEN
    CREATE INDEX "CommunityPost_status_idx" ON "CommunityPost"("status");
  END IF;
END $$;

-- ── CommunityVote ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityVote_pkey') THEN
    CREATE TABLE "CommunityVote" (
      "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
      "targetType" TEXT NOT NULL,          -- 'topic' | 'post'
      "targetId"   TEXT NOT NULL,
      "userId"     TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
      "value"      INTEGER NOT NULL,       -- 1 = like, -1 = dislike
      "createdAt"  TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CommunityVote_targetType_targetId_userId_key') THEN
    ALTER TABLE "CommunityVote"
      ADD CONSTRAINT "CommunityVote_targetType_targetId_userId_key"
      UNIQUE ("targetType", "targetId", "userId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityVote_targetId_idx') THEN
    CREATE INDEX "CommunityVote_targetId_idx" ON "CommunityVote"("targetId");
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'CommunityVote_userId_idx') THEN
    CREATE INDEX "CommunityVote_userId_idx" ON "CommunityVote"("userId");
  END IF;
END $$;
