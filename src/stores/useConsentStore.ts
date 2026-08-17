// src/stores/useConsentStore.ts
// Zustand store for cookie preferences + optional-script consent state
// (design D7/D9, WU4 task 4.3).
//
// Flow:
// - loadPreferences(): read the versioned localStorage cache (UI source of
//   truth, never evidence); when a session token is present, the server-side
//   CookiePreference row (if any) wins and is mirrored back to the cache.
//   Applying the consent state to the script gate happens here, so optional
//   scripts load ONLY after a decision exists.
// - savePreferences(): normalize + persist locally (cookieManager), apply the
//   script gate immediately, then best-effort sync to
//   POST /api/consent/preferences when authenticated. A failed sync never
//   blocks the UI — the local cache governs the current session.
//
// The store never treats localStorage as evidence: optional-category grants
// for authenticated users are recorded server-side as ConsentRecord rows via
// /api/consent (WU3 flow); this store only manages the operational
// preference state (design D7).

import { create } from 'zustand';

import { COOKIE_CATEGORIES } from '../config/legal';
import {
  getCookiePolicyVersion,
  loadCookiePreferences,
  normalizeCookiePreferences,
  saveCookiePreferences as persistLocalPreferences,
} from '../lib/cookieManager';
import type { CookiePreferenceRecord } from '../lib/cookieManager';
import { applyOptionalScriptConsent } from '../lib/scriptGate';
import {
  getCookiePreferences,
  saveCookiePreferences as syncPreferencesToServer,
} from '../lib/api';

interface ConsentState {
  /** Current preference record; null = the user has never decided. */
  preferences: CookiePreferenceRecord | null;
  /** True once the initial load (local cache + optional server sync) finished. */
  hydrated: boolean;
  /**
   * Load preferences: local cache first, then (when authenticated) the
   * server-side row wins if present. Applies the consent state to the script
   * gate — with no decision, optional categories are denied.
   */
  loadPreferences: (token?: string | null) => Promise<void>;
  /**
   * Save a category choice: persist locally, apply the script gate, then
   * best-effort sync to the server when a token is provided.
   */
  savePreferences: (
    categories: Record<string, boolean>,
    opts?: { token?: string | null; locale?: string }
  ) => Promise<void>;
  /** UI helper: is this category consented? Essentials are always consented. */
  isConsented: (categoryId: string) => boolean;
}

export const useConsentStore = create<ConsentState>((set, get) => ({
  preferences: null,
  hydrated: false,

  loadPreferences: async (token?: string | null) => {
    let preferences = loadCookiePreferences();

    if (token) {
      try {
        const server = await getCookiePreferences(token);
        if (server.preferences) {
          // Server row (if any) is the authoritative current state; mirror it
          // into the local cache so the next anonymous visit agrees.
          preferences = normalizeCookiePreferences({
            policyVersion: server.preferences.policyVersion,
            categories: server.preferences.categories,
            date: server.preferences.updatedAt,
          });
          persistLocalPreferences(preferences);
        }
      } catch (err) {
        // Server sync is best-effort — the local cache still governs the UI.
        console.warn('Não foi possível sincronizar preferências de cookies:', err);
      }
    }

    set({ preferences, hydrated: true });
    // With no decision, apply an empty consent map: the gate loads NOTHING
    // optional before consent (spec: Single script gate).
    applyOptionalScriptConsent(preferences ? preferences.categories : {});
  },

  savePreferences: async (categories, opts) => {
    const record = persistLocalPreferences({
      policyVersion: getCookiePolicyVersion(),
      categories,
      date: new Date().toISOString(),
    });

    applyOptionalScriptConsent(record.categories);
    set({ preferences: record });

    if (opts?.token) {
      try {
        await syncPreferencesToServer(opts.token, {
          policyVersion: record.policyVersion,
          categories: record.categories,
          locale: opts.locale,
        });
      } catch (err) {
        console.warn('Não foi possível sincronizar preferências de cookies:', err);
      }
    }
  },

  isConsented: (categoryId) => {
    const category = COOKIE_CATEGORIES.find((c) => c.id === categoryId);
    if (category?.essential) return true;
    return get().preferences?.categories[categoryId] === true;
  },
}));
