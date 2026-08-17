// src/lib/scriptGate.ts
// Single choke point for optional third-party scripts (design D7, WU4 task
// 4.2). ALL optional script loading must go through
// `registerOptionalScript(category, loader)`; the gate loads nothing until
// consent is granted for the script's category, re-evaluates on preference
// changes, and never loads a script twice.
//
// Rules enforced here (spec: cookie-consent-manager / Single script gate):
// - No optional script is requested before consent for its category.
// - Only scripts of consented categories load.
// - Preference changes are respected: a category granted later loads then;
//   already-loaded scripts are never re-loaded (no unload mechanism exists
//   for third-party scripts — revocation only stops future loads).
// - Duplicate registrations with the same id are ignored.
//
// No real analytics/marketing integrations are registered in this file —
// integrations call `registerOptionalScript` and the gate decides. The
// categories come from the same legal config the UI reads (D1).

export type OptionalScriptLoader = () => void;

interface RegisteredScript {
  id: string;
  category: string;
  loader: OptionalScriptLoader;
  loaded: boolean;
}

/** Latest applied consent state: category id → accepted. Empty = deny all. */
let consentState: Record<string, boolean> = {};
const scripts: RegisteredScript[] = [];
let nextId = 0;

function isConsented(category: string): boolean {
  return consentState[category] === true;
}

function maybeLoad(script: RegisteredScript): void {
  if (script.loaded) return;
  if (!isConsented(script.category)) return;
  script.loader();
  script.loaded = true;
}

/**
 * Register an optional script under a category. Returns the script id.
 * If consent for the category is ALREADY granted (e.g. the user chose
 * preferences before this component mounted), the loader runs immediately —
 * but only once. Passing the same `id` again is a no-op.
 */
export function registerOptionalScript(
  category: string,
  loader: OptionalScriptLoader,
  id?: string
): string {
  const scriptId = id ?? `${category}:${nextId++}`;
  if (scripts.some((s) => s.id === scriptId)) return scriptId;
  const script: RegisteredScript = { id: scriptId, category, loader, loaded: false };
  scripts.push(script);
  maybeLoad(script);
  return scriptId;
}

/**
 * Apply the latest consent state (call on load and whenever preferences
 * change). Loads every registered script whose category is now consented and
 * that has not loaded yet; consented-but-denied categories load nothing.
 */
export function applyOptionalScriptConsent(categories: Record<string, boolean>): void {
  consentState = { ...categories };
  for (const script of scripts) maybeLoad(script);
}

/** True when the script with the given id has already been loaded. */
export function isOptionalScriptLoaded(id: string): boolean {
  const script = scripts.find((s) => s.id === id);
  return script !== undefined && script.loaded;
}

/** Test helper: clear all registrations and the consent state. */
export function resetScriptGate(): void {
  scripts.length = 0;
  consentState = {};
  nextId = 0;
}
