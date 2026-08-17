// tests/signup-intent.test.ts
// Strict TDD (WU3): RED-first tests for the pure signup-intent helpers
// (src/lib/signupIntent.ts). These helpers are the only pure logic WU3 adds:
//   - buildSignupIntent / parseSignupIntent: sessionStorage intent shape
//     (D1 — UI intent, NEVER evidence; localStorage/sessionStorage is never
//     treated as evidence by any server path).
//   - buildConsentRequests: maps a signup intent + active legal docs to the
//     POST /api/consent request bodies (mandatory service-purpose docs always;
//     optional accepted ids only when checked).
// Pure node-env unit tests — no mocks, no DOM, no DB.

import { describe, it, expect } from 'vitest';

import {
  SIGNUP_INTENT_KEY,
  buildSignupIntent,
  parseSignupIntent,
  buildConsentRequests,
  normalizeConsentLocale,
} from '../src/lib/signupIntent';

import { activeLegalDocs } from '../src/config/legal';

// Fixed "today" so active-version resolution is deterministic regardless of
// when the suite runs: privacy_policy v2, terms_of_service v1 and
// cookie_policy v1 are active; cookie_policy v2 (2099) is not.
const TODAY = new Date('2026-08-20T12:00:00Z');

const active = activeLegalDocs(TODAY);
const activeIds = active.map((d) => d.id).sort();

describe('SIGNUP_INTENT_KEY — namespaced sessionStorage key', () => {
  it('is a namespaced string (repo convention: conectaperu_ prefix)', () => {
    expect(typeof SIGNUP_INTENT_KEY).toBe('string');
    expect(SIGNUP_INTENT_KEY.startsWith('conectaperu_')).toBe(true);
    expect(SIGNUP_INTENT_KEY.length).toBeGreaterThan(10);
  });
});

describe('buildSignupIntent — UI intent payload (never evidence)', () => {
  it('returns legalVersions, optionalAccepted and a numeric ts', () => {
    const before = Date.now();
    const intent = buildSignupIntent(['terms_of_service', 'privacy_policy'], ['marketing']);
    expect(intent.legalVersions).toEqual(['terms_of_service', 'privacy_policy']);
    expect(intent.optionalAccepted).toEqual(['marketing']);
    expect(typeof intent.ts).toBe('number');
    expect(intent.ts).toBeGreaterThanOrEqual(before);
    expect(intent.ts).toBeLessThanOrEqual(Date.now());
  });

  it('returns empty optionalAccepted when none are checked', () => {
    const intent = buildSignupIntent(['terms_of_service'], []);
    expect(intent.optionalAccepted).toEqual([]);
  });

  it('throws when legalVersions is empty (mandatory consent is required before signup)', () => {
    expect(() => buildSignupIntent([], [])).toThrow();
  });
});

describe('parseSignupIntent — safe parse of the stored intent', () => {
  it('returns null for null/empty input', () => {
    expect(parseSignupIntent(null)).toBeNull();
    expect(parseSignupIntent('')).toBeNull();
    expect(parseSignupIntent('   ')).toBeNull();
  });

  it('returns null for invalid JSON', () => {
    expect(parseSignupIntent('not json')).toBeNull();
    expect(parseSignupIntent('{"legalVersions":')).toBeNull();
  });

  it('returns null when legalVersions is missing/empty (no intent without mandatory docs)', () => {
    expect(parseSignupIntent('{"optionalAccepted":[],"ts":1}')).toBeNull();
    expect(parseSignupIntent('{"legalVersions":[],"optionalAccepted":[],"ts":1}')).toBeNull();
  });

  it('returns null when ts is missing or not a number', () => {
    expect(parseSignupIntent('{"legalVersions":["terms_of_service"],"optionalAccepted":[]}')).toBeNull();
    expect(parseSignupIntent('{"legalVersions":["terms_of_service"],"optionalAccepted":[],"ts":"x"}')).toBeNull();
  });

  it('parses a well-formed intent', () => {
    const intent = parseSignupIntent(
      '{"legalVersions":["terms_of_service","privacy_policy"],"optionalAccepted":["marketing"],"ts":123}'
    );
    expect(intent).toEqual({
      legalVersions: ['terms_of_service', 'privacy_policy'],
      optionalAccepted: ['marketing'],
      ts: 123,
    });
  });

  it('round-trips buildSignupIntent output', () => {
    const built = buildSignupIntent(['terms_of_service', 'privacy_policy'], ['marketing']);
    const parsed = parseSignupIntent(JSON.stringify(built));
    expect(parsed).toEqual(built);
  });
});

describe('normalizeConsentLocale — closed-list locale normalization', () => {
  it('maps pt-BR, empty and undefined to pt-BR', () => {
    expect(normalizeConsentLocale('pt-BR')).toBe('pt-BR');
    expect(normalizeConsentLocale('')).toBe('pt-BR');
    expect(normalizeConsentLocale(undefined)).toBe('pt-BR');
  });

  it('maps es and es-PE to es-PE', () => {
    expect(normalizeConsentLocale('es')).toBe('es-PE');
    expect(normalizeConsentLocale('es-PE')).toBe('es-PE');
  });

  it('falls back to pt-BR for unknown languages', () => {
    expect(normalizeConsentLocale('en')).toBe('pt-BR');
    expect(normalizeConsentLocale('de-DE')).toBe('pt-BR');
  });
});

describe('buildConsentRequests — intent + active docs → POST /api/consent bodies', () => {
  it('always maps mandatory service-purpose active docs (terms + privacy) with granted=true', () => {
    const intent = buildSignupIntent(['terms_of_service', 'privacy_policy'], []);
    const requests = buildConsentRequests(intent, active, { source: 'onboarding', locale: 'pt-BR' });

    const docTypes = requests.map((r) => r.documentType).sort();
    expect(docTypes).toEqual(['privacy_policy', 'terms_of_service']);

    for (const req of requests) {
      expect(req.granted).toBe(true);
      expect(req.purpose).toBe('service');
      expect(req.source).toBe('onboarding');
      expect(req.locale).toBe('pt-BR');
      const doc = active.find((d) => d.id === req.documentType)!;
      expect(req.documentVersion).toBe(doc.version);
      expect(req.legalBasis).toBe(doc.legalBases[0]);
      expect(typeof req.idempotencyKey).toBe('string');
      expect(req.idempotencyKey.length).toBeGreaterThan(0);
    }
  });

  it('adds a cookie_policy consent (purpose marketing, basis consent) when marketing is accepted', () => {
    const intent = buildSignupIntent(['terms_of_service', 'privacy_policy'], ['marketing']);
    const requests = buildConsentRequests(intent, active, { source: 'onboarding', locale: 'es-PE' });

    const marketing = requests.find((r) => r.documentType === 'cookie_policy');
    expect(marketing).toBeDefined();
    expect(marketing!.purpose).toBe('marketing');
    expect(marketing!.legalBasis).toBe('consent');
    expect(marketing!.granted).toBe(true);
    expect(marketing!.source).toBe('onboarding');
    expect(marketing!.locale).toBe('es-PE');
    const cookieDoc = active.find((d) => d.id === 'cookie_policy')!;
    expect(marketing!.documentVersion).toBe(cookieDoc.version);
  });

  it('skips unknown optional ids (defensive; closed list lives server-side)', () => {
    const intent = buildSignupIntent(['terms_of_service'], ['nonexistent_opt']);
    const requests = buildConsentRequests(intent, active, { source: 'onboarding', locale: 'pt-BR' });
    expect(requests.some((r) => r.documentType === 'cookie_policy')).toBe(false);
  });

  it('does not add optional requests when nothing optional was accepted', () => {
    const intent = buildSignupIntent(['terms_of_service', 'privacy_policy'], []);
    const requests = buildConsentRequests(intent, active, { source: 'onboarding', locale: 'pt-BR' });
    expect(requests.some((r) => r.documentType === 'cookie_policy')).toBe(false);
  });

  it('uses the passed source (reconsent) for every request', () => {
    const intent = buildSignupIntent(['privacy_policy'], []);
    const requests = buildConsentRequests(intent, active, { source: 'reconsent', locale: 'pt-BR' });
    expect(requests.length).toBeGreaterThan(0);
    for (const req of requests) expect(req.source).toBe('reconsent');
  });

  it('derives idempotencyKey deterministically from the intent ts + doc + purpose', () => {
    const intent = buildSignupIntent(['privacy_policy'], []);
    const a = buildConsentRequests(intent, active, { source: 'onboarding', locale: 'pt-BR' });
    const b = buildConsentRequests(intent, active, { source: 'onboarding', locale: 'pt-BR' });
    expect(a.map((r) => r.idempotencyKey)).toEqual(b.map((r) => r.idempotencyKey));
    // Different intents (new ts) must produce different keys for the same doc.
    const intent2 = { ...intent, ts: intent.ts + 1 };
    const c = buildConsentRequests(intent2, active, { source: 'onboarding', locale: 'pt-BR' });
    expect(c.map((r) => r.idempotencyKey)).not.toEqual(a.map((r) => r.idempotencyKey));
  });
});
