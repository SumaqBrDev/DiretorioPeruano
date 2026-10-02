-- prisma/unify_category_vocabulary.sql
--
-- The BusinessProfile.category column holds two spellings of the same
-- category: the Spanish 'servicios' (from seeded data) and the Portuguese
-- 'servicos' (what the signup form actually writes). The search page could
-- not match one against the other, so an approved business was unreachable
-- through the category filter.
--
-- Canonical target = the value the application WRITES today, taken from the
-- CATEGORIES list in src/pages/Onboarding.tsx and src/pages/MeuNegocio.tsx:
--   restaurante | mercado | cafe | servicos | salud | juridico
--   financiero  | imuebles
--
-- Aligning the stored data with the write vocabulary means no application
-- code has to change and no future insert reintroduces the split.
--
-- Properties:
--   - Idempotent: a second run updates zero rows.
--   - Narrow: touches ONLY rows whose category is a known non-canonical
--     spelling. Rows already canonical, and unknown values, are left alone.
--   - Reversible: the pre-change state is preserved in the Neon branch
--     pre-category-unify-2026-10-01.
--   - updatedAt is deliberately NOT bumped: this is a data-format repair,
--     not a business edit by the owner.

BEGIN;

-- Report the state before the change.
SELECT 'BEFORE' AS phase, category, COUNT(*) AS rows
FROM "BusinessProfile"
GROUP BY category
ORDER BY category;

-- Spanish/alternate spellings -> canonical Portuguese value written by the app.
UPDATE "BusinessProfile" SET category = 'servicos'
 WHERE category IN ('servicios', 'serviços', 'servicio', 'servico');

UPDATE "BusinessProfile" SET category = 'restaurante'
 WHERE category IN ('restaurantes');

UPDATE "BusinessProfile" SET category = 'mercado'
 WHERE category IN ('mercados');

UPDATE "BusinessProfile" SET category = 'salud'
 WHERE category IN ('saude', 'saúde');

UPDATE "BusinessProfile" SET category = 'financiero'
 WHERE category IN ('financeiro');

UPDATE "BusinessProfile" SET category = 'imuebles'
 WHERE category IN ('inmuebles', 'imoveis', 'imóveis');

UPDATE "BusinessProfile" SET category = 'salon'
 WHERE category IN ('salones', 'saloes', 'salões');

UPDATE "BusinessProfile" SET category = 'cafe'
 WHERE category IN ('cafes', 'cafés', 'café');

-- Report the state after the change.
SELECT 'AFTER' AS phase, category, COUNT(*) AS rows
FROM "BusinessProfile"
GROUP BY category
ORDER BY category;

-- Guard: fail loudly if any non-canonical spelling survived.
DO $$
DECLARE
  leftover INTEGER;
BEGIN
  SELECT COUNT(*) INTO leftover
  FROM "BusinessProfile"
  WHERE category IN (
    'servicios','serviços','servicio','servico',
    'restaurantes','mercados','saude','saúde','financeiro',
    'inmuebles','imoveis','imóveis','salones','saloes','salões',
    'cafes','cafés','café'
  );
  IF leftover > 0 THEN
    RAISE EXCEPTION 'Non-canonical categories still present: %', leftover;
  END IF;
END $$;

COMMIT;
