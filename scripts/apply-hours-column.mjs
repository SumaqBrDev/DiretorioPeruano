// One-off idempotent migration runner for the missing BusinessProfile.hours column.
// Run via: npx netlify dev:exec -- node scripts/apply-hours-column.mjs
// Never logs the connection string.
import pg from 'pg';

const { Client } = pg;

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL not set in this environment');
    process.exit(1);
  }

  const client = new Client({ connectionString, ssl: { rejectUnauthorized: true } });
  await client.connect();

  try {
    await client.query('BEGIN');

    // Check before
    const before = await client.query(
      `SELECT column_name FROM information_schema.columns WHERE table_name = 'BusinessProfile' AND column_name = 'hours'`
    );
    console.log('Column exists before:', before.rows.length > 0);

    await client.query(`ALTER TABLE "BusinessProfile" ADD COLUMN IF NOT EXISTS hours JSONB`);

    const after = await client.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'BusinessProfile' AND column_name = 'hours'`
    );

    await client.query('COMMIT');

    console.log('Column exists after:', after.rows.length > 0, after.rows);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration failed, rolled back:', err.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
