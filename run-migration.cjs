const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function runMigration() {
  const sql = fs.readFileSync('./prisma/migration_manual.sql', 'utf-8');
  
  // Split by semicolon and execute each statement
  const statements = sql.split(';').filter(s => s.trim());
  
  for (const stmt of statements) {
    if (stmt.trim()) {
      try {
        await prisma.$executeRawUnsafe(stmt);
        console.log('✓ Executed:', stmt.trim().substring(0, 60) + '...');
      } catch (e) {
        if (e.message.includes('already exists') || e.message.includes('duplicate')) {
          console.log('⊘ Skipped (exists):', stmt.trim().substring(0, 60) + '...');
        } else {
          console.error('✗ Error:', e.message);
          console.error('Statement:', stmt.trim().substring(0, 100));
        }
      }
    }
  }
  console.log('Migration complete!');
  await prisma.$disconnect();
}

runMigration().catch(console.error);