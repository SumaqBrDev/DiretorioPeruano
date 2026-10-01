// scripts/run-upgrade-intent-migration.mjs
// Applies prisma/upgrade_intent_migration.sql (User.businessIntentAt).
//
// The repo does NOT use `prisma migrate`; manual SQL is the convention.
// Mirrors run-lgpd-migration.mjs:
//   - uses `pg` directly (Prisma 7 requires a driver adapter, so a bare
//     `new PrismaClient()` cannot be constructed here),
//   - runs the whole file inside ONE transaction (all-or-nothing),
//   - exits non-zero on failure instead of only logging,
//   - verifies the resulting column after COMMIT.
//
// The SQL itself is idempotent (ADD COLUMN IF NOT EXISTS), so a re-run is a
// safe no-op.
//
// Usage: DATABASE_URL=... node scripts/run-upgrade-intent-migration.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.join(__dirname, '..', 'prisma', 'upgrade_intent_migration.sql');

const EXPECTED_TABLE = 'User';
const EXPECTED_COLUMN = 'businessIntentAt';

const COLUMN_QUERY = `
  SELECT column_name, data_type, is_nullable
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = $1
    AND column_name = $2`;

function fail(message) {
  console.error(`\n[FAIL] ${message}`);
  process.exit(1);
}

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) fail('DATABASE_URL is not set.');

  const sql = fs.readFileSync(SQL_PATH, 'utf-8');
  console.log(`[info] SQL source: ${path.relative(process.cwd(), SQL_PATH)} (${sql.length} bytes)`);

  const client = new pg.Client({ connectionString });
  await client.connect();

  try {
    const before = await client.query(COLUMN_QUERY, [EXPECTED_TABLE, EXPECTED_COLUMN]);
    console.log(
      `[info] Column present BEFORE: ${before.rowCount > 0 ? JSON.stringify(before.rows[0]) : '(none)'}`
    );

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('COMMIT');
      console.log('[ok] Migration committed.');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      fail(`Migration failed and was rolled back: ${err.message}`);
    }

    const after = await client.query(COLUMN_QUERY, [EXPECTED_TABLE, EXPECTED_COLUMN]);
    if (after.rowCount === 0) {
      fail(`Column "${EXPECTED_COLUMN}" is still missing after COMMIT.`);
    }

    const column = after.rows[0];
    console.log(`[ok] Column present AFTER: ${JSON.stringify(column)}`);

    if (column.is_nullable !== 'YES') {
      fail(`Column "${EXPECTED_COLUMN}" must be nullable; got is_nullable=${column.is_nullable}.`);
    }

    console.log('[ok] Verification passed.');
  } finally {
    await client.end().catch(() => {});
  }
}

main().catch((err) => fail(err.message));
