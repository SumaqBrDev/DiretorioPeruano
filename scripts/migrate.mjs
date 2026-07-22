import pg from 'pg';
import fs from 'fs';

const { Client } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL environment variable is required');
  process.exit(1);
}

const client = new Client({ connectionString });

async function main() {
  await client.connect();
  console.log('✅ Connected to database');
  
  const sql = fs.readFileSync('prisma/migration_manual.sql', 'utf-8');
  
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));
  
  let success = 0, skipped = 0, failed = 0;
  
  for (const stmt of statements) {
    try {
      await client.query(stmt);
      console.log('✅', stmt.substring(0, 70));
      success++;
    } catch (e) {
      if (e.message?.includes('already exists')) {
        console.log('⏭️', stmt.substring(0, 50));
        skipped++;
      } else {
        console.error('❌', e.message?.substring(0, 120));
        failed++;
      }
    }
  }
  
  console.log(`\n📊 Migration complete: ${success} success, ${skipped} skipped, ${failed} failed`);
  await client.end();
}

main().catch(console.error);