// tests/consent-rights.test.ts
// Strict TDD (WU5 task 5.1): RED-first tests for the pure consent-rights
// helpers (src/lib/consentHistory.ts) that drive the /preferencias UI:
//   - resolveCurrentFromRecords: latest row per (documentType, purpose) —
//     mirrors the server's resolveCurrentConsents (spec consent-rights-
//     preferences / Preferences UI: "current consent state per document").
//   - isMandatoryPurpose / isOptionalPurpose: which consents are revocable
//     (mandatory service-contract consents are NOT revocable while the
//     account is active — spec: Revocation channel).
// Pure node-env unit tests — no mocks, no DOM, no DB (design D9).

import { describe, it, expect } from 'vitest';

import type { ConsentRecord } from '../src/lib/api';
import {
  resolveCurrentFromRecords,
  isMandatoryPurpose,
  isOptionalPurpose,
} from '../src/lib/consentHistory';

function row(overrides: Partial<ConsentRecord> & { id: string }): ConsentRecord {
  return {
    documentType: 'cookie_policy',
    documentVersion: '1',
    documentHash: 'a'.repeat(64),
    purpose: 'analytics',
    legalBasis: 'consent',
    intent: 'grant',
    granted: true,
    consentedAt: '2026-08-17T12:00:00.000Z',
    source: 'settings',
    locale: 'pt-BR',
    ...overrides,
  };
}

describe('resolveCurrentFromRecords — latest row per (documentType, purpose)', () => {
  it('returns an empty array for no records', () => {
    expect(resolveCurrentFromRecords([])).toEqual([]);
  });

  it('returns the newest row per (documentType, purpose)', () => {
    const records = [
      row({ id: 'c1', granted: true, consentedAt: '2026-08-01T10:00:00.000Z' }),
      row({ id: 'c2', granted: false, consentedAt: '2026-08-10T10:00:00.000Z' }),
    ];

    const current = resolveCurrentFromRecords(records);

    expect(current).toHaveLength(1);
    expect(current[0]).toMatchObject({
      documentType: 'cookie_policy',
      purpose: 'analytics',
      version: '1',
      granted: false,
      consentedAt: '2026-08-10T10:00:00.000Z',
    });
  });

  it('a re-grant after a revocation wins (append-only history, current flips back)', () => {
    const records = [
      row({ id: 'c1', granted: true, consentedAt: '2026-08-01T10:00:00.000Z' }),
      row({ id: 'c2', granted: false, consentedAt: '2026-08-10T10:00:00.000Z' }),
      row({ id: 'c3', granted: true, consentedAt: '2026-08-15T10:00:00.000Z' }),
    ];

    const current = resolveCurrentFromRecords(records);

    expect(current).toHaveLength(1);
    expect(current[0].granted).toBe(true);
    // Only display fields are exposed (no raw row id leaks into the UI).
    expect(Object.keys(current[0]).sort()).toEqual(['consentedAt', 'documentType', 'granted', 'purpose', 'version']);
  });

  it('keeps different purposes of the same document separate', () => {
    const records = [
      row({ id: 'c1', purpose: 'analytics', granted: true, consentedAt: '2026-08-01T10:00:00.000Z' }),
      row({ id: 'c2', purpose: 'marketing', granted: false, consentedAt: '2026-08-02T10:00:00.000Z' }),
      row({ id: 'c3', purpose: 'marketing', granted: true, consentedAt: '2026-08-03T10:00:00.000Z' }),
    ];

    const current = resolveCurrentFromRecords(records);

    expect(current).toHaveLength(2);
    const byPurpose = new Map(current.map((c) => [c.purpose, c]));
    expect(byPurpose.get('analytics')?.granted).toBe(true);
    expect(byPurpose.get('marketing')?.granted).toBe(true);
    expect(byPurpose.get('marketing')?.consentedAt).toBe('2026-08-03T10:00:00.000Z');
  });

  it('is independent of input order (sorts by consentedAt descending)', () => {
    const records = [
      row({ id: 'old', granted: true, consentedAt: '2026-08-01T10:00:00.000Z' }),
      row({ id: 'new', granted: false, consentedAt: '2026-08-20T10:00:00.000Z' }),
    ];

    const shuffled = [records[1], records[0]];
    const current = resolveCurrentFromRecords(shuffled);

    expect(current[0].granted).toBe(false);
    expect(current[0].consentedAt).toBe('2026-08-20T10:00:00.000Z');
  });

  it('carries the version of the winning row', () => {
    const records = [
      row({ id: 'v1', documentVersion: '1', granted: true, consentedAt: '2026-08-01T10:00:00.000Z' }),
      row({ id: 'v2', documentVersion: '2', granted: true, consentedAt: '2026-08-17T10:00:00.000Z' }),
    ];

    const current = resolveCurrentFromRecords(records);

    expect(current[0].version).toBe('2');
  });
});

describe('isMandatoryPurpose — service-contract consents are not revocable', () => {
  it('treats purpose=service as mandatory', () => {
    expect(isMandatoryPurpose('service')).toBe(true);
  });

  it('treats optional purposes as non-mandatory', () => {
    expect(isMandatoryPurpose('marketing')).toBe(false);
    expect(isMandatoryPurpose('analytics')).toBe(false);
  });
});

describe('isOptionalPurpose — user-controlled cookie consents', () => {
  it('accepts analytics and marketing', () => {
    expect(isOptionalPurpose('analytics')).toBe(true);
    expect(isOptionalPurpose('marketing')).toBe(true);
  });

  it('rejects the mandatory service purpose', () => {
    expect(isOptionalPurpose('service')).toBe(false);
  });
});
