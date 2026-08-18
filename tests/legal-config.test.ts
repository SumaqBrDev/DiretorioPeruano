// tests/legal-config.test.ts
// Strict TDD (WU1 task 1.1): RED-first tests for the legal document registry
// config (src/config/legal.ts). Acceptance criteria: consent-governance-core /
// Active version resolution, Future-dated version, Unknown document, plus
// hash integrity and the legalApproved flag (D10).
// Pure node-env unit tests — no mocks, no DB.

import { describe, it, expect } from 'vitest';

import {
  LEGAL_DOCS,
  COOKIE_CATEGORIES,
  CLOSED_LISTS,
  activeLegalDocs,
  getLegalDoc,
  getLegalDocVersion,
  computeDocHash,
  verifyLegalDocHashes,
} from '../src/config/legal';

// Deterministic "today" so the tests never depend on the wall clock.
const NOW = new Date('2026-08-17T12:00:00Z');

describe('legal registry — active version resolution', () => {
  it('returns the current version with hash, purposes and legal bases when a newer version is in force', () => {
    const active = getLegalDoc('privacy_policy', NOW);

    expect(active?.version).toBe('2');
    expect(active?.hash).toMatch(/^[0-9a-f]{64}$/);
    expect(active?.purposes).toEqual(['service']);
    expect(active?.legalBases).toEqual(['contract', 'legitimate_interest']);
    expect(active?.locale).toBe('pt-BR');
  });

  it('never returns a superseded version as the active document', () => {
    const superseded = getLegalDocVersion('privacy_policy', '1');
    expect(superseded?.effectiveDate).toBe('2026-01-01');

    const activeVersions = new Map(activeLegalDocs(NOW).map((d) => [d.id, d.version]));
    expect(activeVersions.get('privacy_policy')).toBe('2');
  });
});

describe('legal registry — future-dated version', () => {
  it('does not return a future-dated version as active today', () => {
    const future = getLegalDocVersion('cookie_policy', '2');
    expect(future?.effectiveDate).toBe('2099-01-01');

    const activeVersions = new Map(activeLegalDocs(NOW).map((d) => [d.id, d.version]));
    expect(activeVersions.get('cookie_policy')).toBe('1');
  });

  it('becomes active once its effective date arrives', () => {
    const later = new Date('2099-01-02T00:00:00Z');
    expect(getLegalDoc('cookie_policy', later)?.version).toBe('2');
  });
});

describe('legal registry — unknown document', () => {
  it('fails resolution for a document id absent from the registry', () => {
    expect(getLegalDoc('no_such_document', NOW)).toBeUndefined();
    expect(getLegalDocVersion('no_such_document', '1')).toBeUndefined();
    expect(CLOSED_LISTS.documentTypes).not.toContain('no_such_document');
  });
});

describe('legal registry — hash integrity', () => {
  it('stores a sha256 hash that matches its sections for every registry entry', async () => {
    const mismatches = await verifyLegalDocHashes();
    expect(mismatches).toEqual([]);
  });

  it('recomputes the same hash from the stored sections (no drift)', async () => {
    const doc = getLegalDoc('privacy_policy', NOW);
    expect(doc).toBeDefined();
    expect(await computeDocHash(doc!.sections)).toBe(doc!.hash);
  });

  it('detects content drift when a section body changes', async () => {
    const doc = getLegalDoc('terms_of_service', NOW);
    expect(doc).toBeDefined();
    const tampered = await computeDocHash([
      { title: doc!.sections[0].title, body: `${doc!.sections[0].body} ALTERED` },
    ]);
    expect(tampered).not.toBe(doc!.hash);
  });
});

describe('legal registry — legalApproved flag (D10)', () => {
  it('marks every placeholder document as not legally approved', () => {
    expect(LEGAL_DOCS.length).toBeGreaterThan(0);
    for (const doc of LEGAL_DOCS) {
      expect(doc.legalApproved).toBe(false);
    }
  });

  it('keeps at least one ACTIVE document unapproved (release blocked until legal review)', () => {
    const active = activeLegalDocs(NOW);
    expect(active.length).toBeGreaterThan(0);
    expect(active.some((d) => !d.legalApproved)).toBe(true);
  });
});

describe('legal registry — cookie categories (script gate config)', () => {
  it('defines one essential and two optional categories consumed by the script gate', () => {
    expect(COOKIE_CATEGORIES.map((c) => c.id)).toEqual(['essential', 'analytics', 'marketing']);
    expect(COOKIE_CATEGORIES.find((c) => c.id === 'essential')?.essential).toBe(true);
    expect(COOKIE_CATEGORIES.filter((c) => !c.essential)).toHaveLength(2);
    for (const c of COOKIE_CATEGORIES) {
      expect(c.labelKey.length).toBeGreaterThan(0);
    }
  });
});

describe('legal registry — closed validation lists', () => {
  it('defines the closed lists used to validate consent payloads', () => {
    expect(CLOSED_LISTS.documentTypes).toEqual([
      'terms_of_service',
      'privacy_policy',
      'cookie_policy',
    ]);
    expect(CLOSED_LISTS.purposes).toEqual(['service', 'marketing', 'analytics']);
    expect(CLOSED_LISTS.legalBases).toEqual([
      'contract',
      'consent',
      'legitimate_interest',
    ]);
    expect(CLOSED_LISTS.sources).toEqual([
      'signup',
      'onboarding',
      'reconsent',
      'settings',
      'import',
    ]);
    expect(CLOSED_LISTS.intents).toEqual(['grant', 'revoke']);
  });
});
