import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(__dirname, '..');
const schema = readFileSync(resolve(ROOT, 'prisma/schema.prisma'), 'utf8');
const manualMigration = readFileSync(resolve(ROOT, 'prisma/migration_manual.sql'), 'utf8');
const cleanupSql = readFileSync(resolve(ROOT, 'prisma/cleanup_production.sql'), 'utf8');
const consentLib = readFileSync(resolve(ROOT, 'netlify/functions/lib/consent.ts'), 'utf8');

function expectNormalized(haystack: string, needle: string) {
  const normalizedHaystack = haystack.replace(/\s+/g, ' ');
  const normalizedNeedle = needle.replace(/\s+/g, ' ');
  expect(normalizedHaystack).toContain(normalizedNeedle);
}

describe('test-data lifecycle schema + migration contract', () => {
  it('adds explicit real-by-default classification fields and indexes to User and BusinessProfile', () => {
    expectNormalized(schema, 'dataClassification String @default("real")');
    expectNormalized(schema, 'dataClassifiedAt DateTime @default(now())');
    expectNormalized(schema, '@@index([dataClassification])');
  });

  it('keeps ensureUserByClerkId on the database-default path for future User rows', () => {
    expectNormalized(consentLib, 'create: { clerkId, ...data }');
    expect(consentLib).not.toContain('dataClassification');
    expect(consentLib).not.toContain('dataClassifiedAt');
  });

  it('hard-codes the exact protected email and backfills businesses from owner classification', () => {
    expect(manualMigration).toContain("jarhkof.apps@gmail.com");
    expect(manualMigration).toContain('protected_user_count');
    expectNormalized(manualMigration, 'UPDATE "BusinessProfile" AS b');
    expectNormalized(manualMigration, 'SET "dataClassification" = u."dataClassification"');
    expectNormalized(manualMigration, 'WHERE b."ownerId" = u.id');
  });

  it('fails closed for ownerless businesses instead of silently preserving them as real', () => {
    expectNormalized(manualMigration, 'WHERE b."ownerId" IS NULL AND b."dataClassification" = \'test\'');
    expect(manualMigration).toContain('ownerless test businesses block cleanup');
  });
});

describe('test-data lifecycle cleanup dry run contract', () => {
  it('is read-only, reports excluded WebhookEvent rows, and never deletes data', () => {
    expect(cleanupSql).not.toMatch(/\bDELETE\b/i);
    expect(cleanupSql).not.toMatch(/\bUPDATE\b/i);
    expect(cleanupSql).not.toMatch(/\bINSERT\b/i);
    expect(cleanupSql).not.toMatch(/\bBEGIN\b/i);
    expect(cleanupSql).toContain('WebhookEvent');
    expect(cleanupSql).toContain('excluded');
  });

  it('aborts when the protected user is missing, duplicated, or included in candidates', () => {
    expect(cleanupSql).toContain('jarhkof.apps@gmail.com');
    expect(cleanupSql).toContain('protected user count');
    expect(cleanupSql).toContain('protected user appears in candidate set');
  });
});
