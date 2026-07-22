import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: 'postgresql://neondb_owner:***@ep-long-poetry-atbuzl1z-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require'
    }
  }
});

async function main() {
  console.log('Running migration...');
  const sql = fs.readFileSync('prisma/migration_manual.sql', 'utf-8');
  
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
      if (e.message?.includes('already exists')) {
        console.log('⚠ Already exists');
      } else {
        console.error('✗ Error:', e.message?.substring(0, 100));
      }
    }
  }
  
  console.log('Migration complete!');
  await prisma.$disconnect();
}

main().catch(console.error);