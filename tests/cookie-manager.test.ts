// tests/cookie-manager.test.ts
// Strict TDD (WU4 task 4.1): RED-first tests for the versioned cookie
// preference cache (src/lib/cookieManager.ts). Acceptance criteria:
// cookie-consent-manager / Category-based versioned preferences (preference
// carries policy version + timestamp, changeable later), plus the legacy
// single-boolean migration and the essential-defaults guarantees.
//
// Pure node-env unit tests (design D9): a tiny in-memory StorageLike stands
// in for localStorage; no jsdom, no mocks of the module under test.

import { describe, it, expect } from 'vitest';

import {
  COOKIE_PREFS_KEY,
  LEGACY_COOKIE_KEY,
  defaultCookiePreferences,
  getCookiePolicyVersion,
  loadCookiePreferences,
  normalizeCookiePreferences,
  saveCookiePreferences,
} from '../src/lib/cookieManager';
import type { CookiePreferenceRecord, StorageLike } from '../src/lib/cookieManager';

/** Minimal in-memory StorageLike for the node test env (no jsdom). */
function createMemoryStorage(initial: Record<string, string> = {}): StorageLike {
  const store = new Map(Object.entries(initial));
  return {
    getItem: (key) => store.get(key) ?? null,
    setItem: (key, value) => void store.set(key, value),
    removeItem: (key) => void store.delete(key),
  };
}

describe('cookieManager — versioned read/write', () => {
  it('round-trips a preference record with policyVersion, categories and date', () => {
    const storage = createMemoryStorage();
    const record: CookiePreferenceRecord = {
      policyVersion: '1',
      categories: { essential: true, analytics: true, marketing: false },
      date: '2026-08-17T12:00:00.000Z',
    };

    const saved = saveCookiePreferences(record, storage);
    const loaded = loadCookiePreferences(storage);

    expect(saved.categories).toEqual(record.categories);
    expect(loaded).not.toBeNull();
    expect(loaded?.policyVersion).toBe('1');
    expect(loaded?.categories).toEqual({ essential: true, analytics: true, marketing: false });
    expect(loaded?.date).toBe('2026-08-17T12:00:00.000Z');
  });

  it('persists the payload under the versioned key and cleans the legacy key on save', () => {
    const storage = createMemoryStorage({ [LEGACY_COOKIE_KEY]: 'accepted' });

    saveCookiePreferences(
      { policyVersion: '1', categories: { essential: true, analytics: false, marketing: false }, date: '2026-08-17T12:00:00.000Z' },
      storage
    );

    expect(storage.getItem(LEGACY_COOKIE_KEY)).toBeNull();
    const raw = storage.getItem(COOKIE_PREFS_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toMatchObject({
      policyVersion: '1',
      categories: { essential: true, analytics: false, marketing: false },
    });
  });

  it('reports no decision (null) when nothing was ever stored', () => {
    expect(loadCookiePreferences(createMemoryStorage())).toBeNull();
  });
});

describe('cookieManager — legacy boolean migration', () => {
  it('migrates the legacy accepted boolean into essential-only preferences and removes the old key', () => {
    const storage = createMemoryStorage({ [LEGACY_COOKIE_KEY]: 'accepted' });

    const loaded = loadCookiePreferences(storage);

    expect(loaded).not.toBeNull();
    // The old banner only ever claimed essential cookies ("Não utilizamos
    // cookies de rastreamento ou publicidade") — migration grants NOTHING
    // optional, only essentials.
    expect(loaded?.categories).toEqual({ essential: true, analytics: false, marketing: false });
    expect(loaded?.policyVersion).toBe(getCookiePolicyVersion());
    expect(typeof loaded?.date).toBe('string');
    expect(storage.getItem(LEGACY_COOKIE_KEY)).toBeNull();
    // The migrated decision is persisted under the versioned key.
    expect(storage.getItem(COOKIE_PREFS_KEY)).not.toBeNull();
  });

  it('ignores the legacy boolean when versioned preferences already exist', () => {
    const storage = createMemoryStorage({
      [COOKIE_PREFS_KEY]: JSON.stringify({
        policyVersion: '1',
        categories: { essential: true, analytics: true, marketing: false },
        date: '2026-08-17T12:00:00.000Z',
      }),
      [LEGACY_COOKIE_KEY]: 'accepted',
    });

    const loaded = loadCookiePreferences(storage);

    expect(loaded?.categories.analytics).toBe(true); // versioned value wins
    expect(loaded?.categories.marketing).toBe(false);
    expect(storage.getItem(LEGACY_COOKIE_KEY)).toBeNull(); // legacy key cleaned up
  });

  it('ignores a non-accepted legacy value (never treated as consent)', () => {
    const storage = createMemoryStorage({ [LEGACY_COOKIE_KEY]: 'dismissed' });
    expect(loadCookiePreferences(storage)).toBeNull();
  });
});

describe('cookieManager — defaults and normalization', () => {
  it('defaults: essential accepted, optional categories not accepted, current policy version', () => {
    const defaults = defaultCookiePreferences();

    expect(defaults.categories.essential).toBe(true);
    expect(defaults.categories.analytics).toBe(false);
    expect(defaults.categories.marketing).toBe(false);
    expect(defaults.policyVersion).toBe(getCookiePolicyVersion());
    expect(typeof defaults.date).toBe('string');
  });

  it('only consented optional categories are stored as accepted', () => {
    const storage = createMemoryStorage();

    saveCookiePreferences(
      { policyVersion: '1', categories: { essential: true, analytics: true, marketing: false }, date: '2026-08-17T12:00:00.000Z' },
      storage
    );

    expect(loadCookiePreferences(storage)?.categories).toEqual({
      essential: true,
      analytics: true,
      marketing: false,
    });
  });

  it('normalization forces essential on and drops unknown categories', () => {
    const normalized = normalizeCookiePreferences({
      policyVersion: '1',
      categories: { essential: false, analytics: true, marketing: false, spyware: true },
      date: '2026-08-17T12:00:00.000Z',
    });

    expect(normalized.categories.essential).toBe(true);
    expect(normalized.categories.analytics).toBe(true);
    expect(normalized.categories.marketing).toBe(false);
    expect('spyware' in normalized.categories).toBe(false);
  });

  it('normalization treats malformed or partial input as safe defaults', () => {
    expect(normalizeCookiePreferences(null).categories).toEqual({
      essential: true,
      analytics: false,
      marketing: false,
    });
    expect(normalizeCookiePreferences('garbage').categories.analytics).toBe(false);
    expect(normalizeCookiePreferences({ categories: { analytics: 'yes' } }).categories.analytics).toBe(false);
  });

  it('ignores a malformed versioned payload and reports no decision', () => {
    const storage = createMemoryStorage({ [COOKIE_PREFS_KEY]: '{not json' });
    expect(loadCookiePreferences(storage)).toBeNull();
  });
});

describe('cookieManager — SSR / no-window safety', () => {
  it('does not throw when no storage is available (server-side render)', () => {
    expect(() => loadCookiePreferences()).not.toThrow();
    expect(() =>
      saveCookiePreferences({
        policyVersion: '1',
        categories: { essential: true },
        date: new Date().toISOString(),
      })
    ).not.toThrow();
    expect(() => defaultCookiePreferences()).not.toThrow();
  });
});
