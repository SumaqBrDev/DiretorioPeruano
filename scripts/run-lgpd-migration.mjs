// scripts/run-lgpd-migration.mjs
// Applies prisma/lgpd_migration.sql (LGPD consent governance tables).
//
// The repo does NOT use `prisma migrate`; manual SQL is the convention.
// Unlike the legacy runners this one:
//   - uses `pg` directly (Prisma 7 requires a driver adapter, so a bare
//     `new PrismaClient()` cannot be constructed here),
//   - runs the whole file inside ONE transaction (all-or-nothing),
//   - exits non-zero on failure instead of only logging,
//   - verifies the resulting objects after COMMIT.
//
// The SQL itself is idempotent (CREATE TABLE/INDEX IF NOT EXISTS), so a
// re-run is a safe no-op.
//
// Usage: DATABASE_URL=... node scripts/run-lgpd-migration.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SQL_PATH = path.join(__dirname, '..', 'prisma', 'lgpd_migration.sql');

const EXPECTED_TABLES = ['ConsentRecord', 'CookiePreference'];
const EXPECTED_INDEXES = [
  'consentrecord_user_idem_key',
  'idx_consent_user_doc_purpose',
  'idx_consent_doc_version',
];

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

  // Pre-state: what exists before we touch anything.
  const before = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
    [EXPECTED_TABLES]
  );
  console.log(`[info] Tables present BEFORE: ${before.rows.map((r) => r.tablename).join(', ') || '(none)'}`);

  try {
    await client.query('BEGIN');
    await client.query(sql);
    await client.query('COMMIT');
    console.log('[ok] Migration committed.');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    await client.end().catch(() => {});
    fail(`Migration rolled back: ${err.message}`);
  }

  // Post-state verification: objects must actually exist now.
  const tables = await client.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = ANY($1::text[])`,
    [EXPECTED_TABLES]
  );
  const foundTables = tables.rows.map((r) => r.tablename);
  const missingTables = EXPECTED_TABLES.filter((t) => !foundTables.includes(t));

  const indexes = await client.query(
    `SELECT indexname FROM pg_indexes WHERE schemaname = 'public' AND indexname = ANY($1::text[])`,
    [EXPECTED_INDEXES]
  );
  const foundIndexes = indexes.rows.map((r) => r.indexname);
  const missingIndexes = EXPECTED_INDEXES.filter((i) => !foundIndexes.includes(i));

  const counts = {};
  for (const t of foundTables) {
    const res = await client.query(`SELECT COUNT(*)::int AS n FROM "${t}"`);
    counts[t] = res.rows[0].n;
  }

  const columns = await client.query(
    `SELECT table_name, COUNT(*)::int AS n
       FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = ANY($1::text[])
      GROUP BY table_name ORDER BY table_name`,
    [EXPECTED_TABLES]
  );

  await client.end();

  console.log('\n--- VERIFICATION ---');
  console.log(`Tables:  ${foundTables.join(', ') || '(none)'}`);
  console.log(`Indexes: ${foundIndexes.join(', ') || '(none)'}`);
  for (const row of columns.rows) console.log(`Columns in ${row.table_name}: ${row.n}`);
  for (const [t, n] of Object.entries(counts)) console.log(`Rows in ${t}: ${n}`);

  if (missingTables.length) fail(`Missing tables after migration: ${missingTables.join(', ')}`);
  if (missingIndexes.length) fail(`Missing indexes after migration: ${missingIndexes.join(', ')}`);

  console.log('\n[ok] All expected LGPD objects verified.');
}

main().catch((err) => fail(err.stack || err.message));
