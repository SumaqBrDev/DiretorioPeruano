// scripts/run-manual-migration.mjs
// Run a manual SQL migration with a mandatory dry-run first.
//
// Default is DRY RUN: the file runs inside a transaction that is ALWAYS
// rolled back, so the real effects are observed without keeping them.
// Passing --commit runs it for real.
//
// The SQL file carries its own BEGIN/COMMIT for psql use; both are stripped
// here so this script owns the transaction boundary. Otherwise the file's
// COMMIT would land mid-dry-run and make the rollback a no-op.
//
// Usage:
//   node scripts/run-manual-migration.mjs <file.sql>            # dry run
//   node scripts/run-manual-migration.mjs <file.sql> --commit   # for real
import { readFileSync } from 'node:fs';
import pg from 'pg';

const file = process.argv[2];
const commit = process.argv.includes('--commit');

if (!file) {
  console.error('usage: node scripts/run-manual-migration.mjs <file.sql> [--commit]');
  process.exit(1);
}

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const raw = readFileSync(file, 'utf8');
// Strip the file's own transaction control; this script owns it.
const sql = raw
  .replace(/^\s*BEGIN\s*;\s*$/gim, '')
  .replace(/^\s*COMMIT\s*;\s*$/gim, '');

const client = new pg.Client({ connectionString });

/** Column shape of BusinessAd, used to prove what the migration changed. */
const INSPECT = `
  SELECT column_name, is_nullable, data_type
    FROM information_schema.columns
   WHERE table_name = 'BusinessAd'
     AND column_name IN ('businessId','userId','moderationReason','reviewAttempts',
                         'reviewedAt','reviewedBy','termsVersion','termsAcceptedAt','refundedAt')
   ORDER BY column_name;
`;

async function inspect(label) {
  const { rows } = await client.query(INSPECT);
  console.log(`\n--- ${label} ---`);
  if (rows.length === 0) {
    console.log('(none of the target columns exist)');
  }
  for (const r of rows) {
    console.log(`  ${r.column_name.padEnd(18)} ${r.is_nullable === 'YES' ? 'NULL' : 'NOT NULL'}  ${r.data_type}`);
  }
}

try {
  await client.connect();

  const { rows: counts } = await client.query('SELECT count(*)::int AS n FROM "BusinessAd"');
  console.log(`BusinessAd rows: ${counts[0].n}`);

  await inspect('BEFORE');

  await client.query('BEGIN');
  await client.query(sql);

  await inspect('AFTER (inside transaction)');

  const { rows: orphan } = await client.query(
    'SELECT count(*)::int AS n FROM "BusinessAd" WHERE "userId" IS NULL'
  );
  console.log(`\nads without a purchaser after backfill: ${orphan[0].n}`);

  if (commit) {
    await client.query('COMMIT');
    console.log('\n*** COMMITTED ***');
  } else {
    await client.query('ROLLBACK');
    console.log('\n*** DRY RUN — rolled back, nothing persisted ***');
  }
} catch (error) {
  // A failure inside the transaction leaves it aborted; roll back explicitly
  // so the connection does not close mid-transaction.
  try {
    await client.query('ROLLBACK');
  } catch {
    /* already rolled back or never started */
  }
  console.error('\nFAILED:', error.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
