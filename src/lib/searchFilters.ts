// src/lib/searchFilters.ts
//
// Matching and option-derivation helpers for the business search page.
//
// Three production defects motivated this module:
//   - `normalizeCity` stripped punctuation but not diacritics, so the filter
//     value `sao paulo` never matched the stored `São Paulo`.
//   - The category vocabulary is split in the database (`servicios` AND
//     `servicos` both occur), while the select offered a single spelling.
//   - Cards rendered the raw stored value, so their text disagreed with the
//     select labels.
//
// The select options are derived from the actual results instead of a
// hardcoded list, so a business in an unlisted city stays filterable.

export interface SearchableItem {
  category: string;
  city: string;
  state?: string;
}

export interface SelectOption {
  value: string;
  label: string;
}

export interface CategoryOption {
  value: string;
  /** i18n key shared by the select and the result cards. */
  labelKey: string | null;
}

/**
 * Lowercase, strip diacritics, collapse whitespace.
 *
 * Decomposing with NFD and removing the combining marks makes `São` and `Sao`
 * compare equal — the fix for the city filter.
 */
export function normalizeForMatch(value: string): string {
  if (!value) return '';
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Canonical category vocabulary. Keys are normalized (accent-free, lowercase)
// spellings seen in the database, in URLs, and in the home grid; values are the
// canonical identity used for comparison only — never for display.
const CATEGORY_CANON: Record<string, string> = {
  restaurante: 'restaurante',
  restaurantes: 'restaurante',
  mercado: 'mercado',
  mercados: 'mercado',
  cafe: 'cafe',
  cafes: 'cafe',
  salon: 'salon',
  salones: 'salon',
  saloes: 'salon',
  servicio: 'servicios',
  servicios: 'servicios',
  servico: 'servicios',
  servicos: 'servicios',
  salud: 'salud',
  saude: 'salud',
  juridico: 'juridico',
  financiero: 'financiero',
  financeiro: 'financiero',
  imuebles: 'inmuebles',
  inmuebles: 'inmuebles',
  imoveis: 'inmuebles',
};

// Canonical value -> i18n key that actually exists under `categories.*`.
const CATEGORY_LABEL_KEYS: Record<string, string> = {
  restaurante: 'categories.restaurantes',
  mercado: 'categories.mercados',
  salon: 'categories.salon',
  servicios: 'categories.servicios',
  salud: 'categories.salud',
  juridico: 'categories.juridico',
  financiero: 'categories.financiero',
  inmuebles: 'categories.inmuebles',
};

/**
 * Collapse a category spelling to its canonical identity.
 *
 * An unknown category passes through normalized rather than becoming '', so an
 * unrecognised filter narrows the results instead of silently disappearing.
 */
export function canonicalCategory(category: string): string {
  const n = normalizeForMatch(category);
  if (!n) return '';
  return CATEGORY_CANON[n] ?? n;
}

/** i18n key for a stored category, or null when there is no translation. */
export function categoryLabelKey(category: string): string | null {
  const canon = canonicalCategory(category);
  return CATEGORY_LABEL_KEYS[canon] ?? null;
}

/** True when the item's category satisfies the filter (empty filter matches all). */
export function matchesCategory(itemCategory: string, filter: string): boolean {
  if (!filter) return true;
  return canonicalCategory(itemCategory) === canonicalCategory(filter);
}

/**
 * True when the item's city satisfies the filter (empty filter matches all).
 *
 * The filter may arrive as a bare city or as the "City - ST" label shape, so
 * both the city and the "city state" combination are considered.
 */
export function matchesCity(
  itemCity: string,
  itemState: string | undefined,
  filter: string
): boolean {
  if (!filter) return true;
  const target = normalizeForMatch(filter).replace(/\s*-\s*/g, ' ');
  if (!target) return true;
  const city = normalizeForMatch(itemCity);
  const full = normalizeForMatch(`${itemCity} ${itemState || ''}`);
  return city.includes(target) || full.includes(target) || target.includes(city);
}

/** Distinct cities present in the results, sorted accent-insensitively. */
export function deriveCityOptions(items: SearchableItem[]): SelectOption[] {
  const seen = new Map<string, SelectOption>();
  for (const item of items) {
    const city = (item.city || '').trim();
    if (!city) continue;
    const key = normalizeForMatch(city);
    if (seen.has(key)) continue;
    const state = (item.state || '').trim();
    seen.set(key, { value: city, label: state ? `${city} - ${state}` : city });
  }
  return Array.from(seen.values()).sort((a, b) =>
    normalizeForMatch(a.label).localeCompare(normalizeForMatch(b.label))
  );
}

/** Distinct categories present in the results, collapsed to canonical values. */
export function deriveCategoryOptions(items: SearchableItem[]): CategoryOption[] {
  const seen = new Map<string, CategoryOption>();
  for (const item of items) {
    const raw = (item.category || '').trim();
    if (!raw) continue;
    const canon = canonicalCategory(raw);
    if (!canon || seen.has(canon)) continue;
    seen.set(canon, { value: raw, labelKey: categoryLabelKey(raw) });
  }
  return Array.from(seen.values());
}
