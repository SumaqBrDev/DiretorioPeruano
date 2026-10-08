import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { isValidCnpjFormat, onlyCnpjDigits } from '../src/lib/cnpj';

const ROOT = resolve(__dirname, '..');
const schema = readFileSync(resolve(ROOT, 'prisma/schema.prisma'), 'utf8');
const migration = readFileSync(resolve(ROOT, 'prisma/migrations/manual/20261008_multi_business_cnpj.sql'), 'utf8');
const runner = readFileSync(resolve(ROOT, 'scripts/run-manual-migration.mjs'), 'utf8');

describe('browser-safe CNPJ helper', () => {
  it('validates CNPJ check digits without importing server modules', () => {
    expect(onlyCnpjDigits('11.222.333/0001-81')).toBe('11222333000181');
    expect(isValidCnpjFormat('11.222.333/0001-81')).toBe(true);
    expect(isValidCnpjFormat('11.222.333/0001-82')).toBe(false);
  });
});

describe('multi-business schema and migration contract', () => {
  it('allows one user to own multiple businesses and does not make CNPJ globally unique', () => {
    expect(schema).toContain('businesses         BusinessProfile[]');
    expect(schema).toContain('ownerId            String?');
    expect(schema).not.toContain('ownerId            String?          @unique');
    expect(schema).toContain('cnpj               String?');
    expect(schema).not.toContain('cnpj               String?          @unique');
  });

  it('drops ownerId/CNPJ uniqueness but preserves non-unique lookup indexes', () => {
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS "BusinessProfile_ownerId_key"');
    expect(migration).toContain('DROP INDEX IF EXISTS businessprofile_ownerid_key');
    expect(migration).toContain('DROP CONSTRAINT IF EXISTS "BusinessProfile_cnpj_key"');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS idx_businessprofile_ownerid');
    expect(migration).toContain('CREATE INDEX IF NOT EXISTS idx_businessprofile_cnpj');
  });

  it('manual migration runner inspects BusinessProfile indexes for arbitrary migration files', () => {
    expect(runner).toContain('BusinessProfile');
    expect(runner).toContain('pg_indexes');
    expect(runner).toContain('businessprofile_ownerid');
    expect(runner).toContain('businessprofile_cnpj');
  });
});
