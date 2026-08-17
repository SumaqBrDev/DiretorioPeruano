// src/lib/cookieManager.ts
// Versioned cookie-preference cache (design D7, WU4 task 4.2).
//
// This module is the UI-side cache for cookie-category preferences. Per the
// spec it is LOCALSTORAGE ONLY — a UI intent cache, NEVER evidence. Real
// evidence is the append-only ConsentRecord row written server-side (D7);
// authenticated users additionally sync the same choice to the
// CookiePreference table via POST /api/consent/preferences (see
// src/stores/useConsentStore.ts).
//
// Design notes:
// - Schema-bumped storage key: bump the suffix (v1 → v2) whenever the stored
//   shape changes; old keys are then ignored, never misread.
// - The legacy single-boolean key (`conectaperu_cookie_consent` = 'accepted')
//   is MIGRATED to essential-only preferences (the old banner only claimed
//   essential cookies) and then removed — migration grants nothing optional.
// - SSR/no-window safe: with no storage available every call degrades to a
//   no-op / "no decision", never throws.
// - Categories come from the legal registry (COOKIE_CATEGORIES, design D1) —
//   the script gate reads the same config, so UI and gate can never drift.
// - Essential categories cannot be disabled; unknown categories are dropped.

import { COOKIE_CATEGORIES, activeLegalDocs } from '../config/legal';

/** Schema-bumped key for the versioned preference cache. */
export const COOKIE_PREFS_KEY = 'conectaperu_cookie_prefs_v1';

/** Legacy single-boolean key written by the pre-WU4 banner (never evidence). */
export const LEGACY_COOKIE_KEY = 'conectaperu_cookie_consent';

export interface CookiePreferenceRecord {
  /** Cookie policy version the choice was made against (registry version). */
  policyVersion: string;
  /** Category id → accepted. Essential categories are always true. */
  categories: Record<string, boolean>;
  /** ISO timestamp of the decision. */
  date: string;
}

/** Minimal storage surface so tests can inject an in-memory stand-in. */
export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** Storage that swallows everything — used when no window/localStorage exists. */
const NOOP_STORAGE: StorageLike = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

function defaultStorage(): StorageLike {
  try {
    if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  } catch {
    // Accessing window.localStorage can throw in some privacy modes.
  }
  return NOOP_STORAGE;
}

/** Active cookie_policy version from the registry; '1' as a safe fallback. */
export function getCookiePolicyVersion(now: Date = new Date()): string {
  const doc = activeLegalDocs(now).find((d) => d.id === 'cookie_policy');
  return doc?.version ?? '1';
}

/** The safe baseline: essentials accepted, every optional category refused. */
export function defaultCookiePreferences(now: Date = new Date()): CookiePreferenceRecord {
  const categories: Record<string, boolean> = {};
  for (const cat of COOKIE_CATEGORIES) categories[cat.id] = cat.essential;
  return { policyVersion: getCookiePolicyVersion(now), categories, date: now.toISOString() };
}

/**
 * Coerce an unknown payload into a valid preference record: essential stays
 * on, optional categories are boolean-coerced (non-boolean ⇒ false), unknown
 * category ids are dropped, missing policyVersion/date fall back to current
 * values. Malformed input yields the safe defaults.
 */
export function normalizeCookiePreferences(value: unknown, now: Date = new Date()): CookiePreferenceRecord {
  const d = (typeof value === 'object' && value !== null ? value : {}) as Record<string, unknown>;
  const rawCategories =
    typeof d.categories === 'object' && d.categories !== null
      ? (d.categories as Record<string, unknown>)
      : {};

  const categories: Record<string, boolean> = {};
  for (const cat of COOKIE_CATEGORIES) {
    const raw = rawCategories[cat.id];
    categories[cat.id] = cat.essential ? true : typeof raw === 'boolean' ? raw : false;
  }

  const policyVersion =
    typeof d.policyVersion === 'string' && d.policyVersion.trim() !== ''
      ? d.policyVersion
      : getCookiePolicyVersion(now);
  const date = typeof d.date === 'string' && d.date.trim() !== '' ? d.date : now.toISOString();

  return { policyVersion, categories, date };
}

/**
 * Persist a preference record (normalized) under the versioned key and
 * remove the legacy boolean key. Returns the normalized record. Safe to call
 * with no storage available (no-op, never throws).
 */
export function saveCookiePreferences(
  prefs: CookiePreferenceRecord,
  storage: StorageLike = defaultStorage()
): CookiePreferenceRecord {
  const normalized = normalizeCookiePreferences(prefs);
  try {
    storage.setItem(COOKIE_PREFS_KEY, JSON.stringify(normalized));
    storage.removeItem(LEGACY_COOKIE_KEY);
  } catch {
    // Storage can be unavailable/blocked — the in-memory record still stands.
  }
  return normalized;
}

/**
 * Read the stored preferences. Returns:
 * - the stored record (normalized) when the versioned key exists;
 * - a migrated essential-only record when only the legacy boolean key exists
 *   (the legacy key is then removed);
 * - null when no decision was ever stored (banner should ask).
 * Malformed versioned payloads are ignored (never crash, never consent).
 */
export function loadCookiePreferences(storage: StorageLike = defaultStorage()): CookiePreferenceRecord | null {
  let raw: string | null = null;
  try {
    raw = storage.getItem(COOKIE_PREFS_KEY);
  } catch {
    return null;
  }

  if (raw !== null) {
    try {
      const parsed = normalizeCookiePreferences(JSON.parse(raw));
      // Versioned preferences win; clean up the legacy boolean if it lingers.
      try {
        storage.removeItem(LEGACY_COOKIE_KEY);
      } catch {
        // best-effort cleanup
      }
      return parsed;
    } catch {
      return null; // malformed payload — no decision, do not crash
    }
  }

  // No versioned preferences: migrate the legacy boolean if present.
  let legacy: string | null = null;
  try {
    legacy = storage.getItem(LEGACY_COOKIE_KEY);
  } catch {
    return null;
  }
  if (legacy === 'accepted') {
    const migrated = saveCookiePreferences(defaultCookiePreferences(), storage);
    return migrated;
  }
  return null;
}
