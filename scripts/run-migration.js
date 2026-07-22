// scripts/run-migration.js
// Run with: node --env-file=.env scripts/run-migration.js

import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Running manual migration...');
  
  const sql = fs.readFileSync(
    path.join(__dirname, '../prisma/migration_manual.sql'),
    'utf-8'
  );

  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (const stmt of statements) {
    try {
      console.log(`Executing: ${stmt.substring(0, 80)}...`);
      await prisma.$executeRawUnsafe(stmt + ';');
      console.log('✓ Success');
    } catch (e) {
      if (e.message?.includes('already exists') || e.message?.includes('duplicate')) {
        console.log('⚠ Already exists, skipping');
      } else {
        console.error('✗ Error:', e.message);
      }
    }
  }

  console.log('Migration complete!');
  await prisma.$disconnect();
}

main().catch(console.error);