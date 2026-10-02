// tests/search-filters.test.ts
//
// Three defects reported on "Buscar Negócios":
//   1. City filter missed accented cities. `normalizeCity` stripped punctuation
//      but NOT diacritics, so the select value `sao paulo` never matched the
//      stored `São Paulo` — where most businesses are.
//   2. Category filter missed businesses because the DB holds BOTH `servicios`
//      and `servicos`, while the hardcoded select offered only one spelling.
//   3. Cards printed the raw DB value (`servicios`) while the select showed a
//      display label ("Serviços Profissionais"), so names did not correspond.
//
// A fourth, unreported defect: the city/category lists were hardcoded, so a
// business in a city outside the list (e.g. "ayacucho") was unfilterable.

import { describe, it, expect } from 'vitest';
import {
  normalizeForMatch,
  canonicalCategory,
  matchesCategory,
  matchesCity,
  categoryLabelKey,
  deriveCityOptions,
  deriveCategoryOptions,
} from '../src/lib/searchFilters';

describe('normalizeForMatch', () => {
  it('strips diacritics so accented and unaccented spellings match', () => {
    expect(normalizeForMatch('São Paulo')).toBe('sao paulo');
    expect(normalizeForMatch('Brasília')).toBe('brasilia');
    expect(normalizeForMatch('Goiânia')).toBe('goiania');
    expect(normalizeForMatch('Florianópolis')).toBe('florianopolis');
  });

  it('is case-insensitive and trims surrounding whitespace', () => {
    expect(normalizeForMatch('  RIO DE JANEIRO  ')).toBe('rio de janeiro');
  });

  it('tolerates empty and nullish input', () => {
    expect(normalizeForMatch('')).toBe('');
    expect(normalizeForMatch(undefined as unknown as string)).toBe('');
    expect(normalizeForMatch(null as unknown as string)).toBe('');
  });
});

describe('matchesCity', () => {
  // The reported defect: this pair must match.
  it('matches an accented stored city against an unaccented filter', () => {
    expect(matchesCity('São Paulo', 'SP', 'sao paulo')).toBe(true);
  });

  it('matches when both sides carry the accent', () => {
    expect(matchesCity('São Paulo', 'SP', 'São Paulo')).toBe(true);
  });

  it('still matches unaccented cities (no regression)', () => {
    expect(matchesCity('Rio de Janeiro', 'RJ', 'rio de janeiro')).toBe(true);
  });

  it('matches a city stored in lowercase, outside the legacy hardcoded list', () => {
    expect(matchesCity('ayacucho', 'SC', 'ayacucho')).toBe(true);
  });

  it('matches against the "City - ST" shape used by the select labels', () => {
    expect(matchesCity('São Paulo', 'SP', 'sao paulo - sp')).toBe(true);
  });

  it('does not match a different city', () => {
    expect(matchesCity('São Paulo', 'SP', 'curitiba')).toBe(false);
  });

  it('matches everything when no city filter is set', () => {
    expect(matchesCity('São Paulo', 'SP', '')).toBe(true);
  });
});

describe('canonicalCategory', () => {
  // Both spellings exist in production data and must collapse to one value.
  it('maps the pt and es spellings of services to the same canonical value', () => {
    expect(canonicalCategory('servicos')).toBe(canonicalCategory('servicios'));
    expect(canonicalCategory('serviços')).toBe(canonicalCategory('servicios'));
  });

  it('collapses singular and plural spellings', () => {
    expect(canonicalCategory('restaurante')).toBe(canonicalCategory('restaurantes'));
    expect(canonicalCategory('mercado')).toBe(canonicalCategory('mercados'));
  });

  it('collapses the accented and unaccented spellings of real estate', () => {
    expect(canonicalCategory('imuebles')).toBe(canonicalCategory('inmuebles'));
    expect(canonicalCategory('imóveis')).toBe(canonicalCategory('inmuebles'));
  });

  it('is case-insensitive', () => {
    expect(canonicalCategory('RESTAURANTE')).toBe(canonicalCategory('restaurante'));
  });

  it('passes through an unknown category instead of discarding it', () => {
    // The legacy code mapped unknown values to '' , silently dropping the filter.
    expect(canonicalCategory('panaderia')).toBe('panaderia');
  });

  it('returns an empty string for empty input', () => {
    expect(canonicalCategory('')).toBe('');
  });
});

describe('matchesCategory', () => {
  // The reported defect: the approved business is stored as `servicios`
  // while the select offered `servicos`.
  it('matches across the two service spellings found in the database', () => {
    expect(matchesCategory('servicios', 'servicos')).toBe(true);
    expect(matchesCategory('servicos', 'servicios')).toBe(true);
  });

  it('matches singular stored value against plural filter', () => {
    expect(matchesCategory('restaurante', 'restaurantes')).toBe(true);
  });

  it('does not match different categories', () => {
    expect(matchesCategory('restaurante', 'mercado')).toBe(false);
  });

  it('matches everything when no category filter is set', () => {
    expect(matchesCategory('restaurante', '')).toBe(true);
  });
});

describe('categoryLabelKey', () => {
  // Cards must render a translated label, not the raw DB value.
  it('maps both service spellings to the same i18n key', () => {
    expect(categoryLabelKey('servicios')).toBe('categories.servicios');
    expect(categoryLabelKey('servicos')).toBe('categories.servicios');
  });

  it('maps the singular DB value to the plural i18n key that exists', () => {
    expect(categoryLabelKey('restaurante')).toBe('categories.restaurantes');
    expect(categoryLabelKey('mercado')).toBe('categories.mercados');
  });

  it('maps real estate variants to the existing inmuebles key', () => {
    expect(categoryLabelKey('imuebles')).toBe('categories.inmuebles');
  });

  it('returns null for an unknown category so the caller can fall back', () => {
    expect(categoryLabelKey('panaderia')).toBeNull();
  });
});

describe('deriveCityOptions', () => {
  const results = [
    { category: 'restaurante', city: 'São Paulo', state: 'SP' },
    { category: 'restaurante', city: 'São Paulo', state: 'SP' },
    { category: 'servicios', city: 'Rio de Janeiro', state: 'RJ' },
    // Stored lowercase and absent from the legacy hardcoded list.
    { category: 'restaurante', city: 'ayacucho', state: 'SC' },
  ];

  it('includes a city that the hardcoded list omitted', () => {
    const values = deriveCityOptions(results).map((o) => o.value);
    expect(values).toContain('ayacucho');
  });

  it('deduplicates repeated cities', () => {
    const sp = deriveCityOptions(results).filter((o) =>
      normalizeForMatch(o.value).startsWith('sao paulo')
    );
    expect(sp).toHaveLength(1);
  });

  it('labels options with the "City - ST" shape', () => {
    const sp = deriveCityOptions(results).find((o) =>
      normalizeForMatch(o.value).startsWith('sao paulo')
    );
    expect(sp?.label).toBe('São Paulo - SP');
  });

  it('sorts options alphabetically ignoring accents', () => {
    const labels = deriveCityOptions(results).map((o) => o.label);
    expect(labels).toEqual(['ayacucho - SC', 'Rio de Janeiro - RJ', 'São Paulo - SP']);
  });

  it('skips entries with no city', () => {
    const opts = deriveCityOptions([{ category: 'x', city: '', state: '' }]);
    expect(opts).toHaveLength(0);
  });
});

describe('deriveCategoryOptions', () => {
  const results = [
    { category: 'restaurante', city: 'São Paulo', state: 'SP' },
    { category: 'restaurante', city: 'São Paulo', state: 'SP' },
    // Both spellings present, as in production.
    { category: 'servicios', city: 'Rio de Janeiro', state: 'RJ' },
    { category: 'servicos', city: 'Rio de Janeiro', state: 'RJ' },
  ];

  it('collapses the two service spellings into a single option', () => {
    const services = deriveCategoryOptions(results).filter(
      (o) => canonicalCategory(o.value) === canonicalCategory('servicios')
    );
    expect(services).toHaveLength(1);
  });

  it('exposes the i18n key so the select and the cards share one label', () => {
    const svc = deriveCategoryOptions(results).find(
      (o) => canonicalCategory(o.value) === canonicalCategory('servicios')
    );
    expect(svc?.labelKey).toBe('categories.servicios');
  });

  it('derives only the categories actually present in the results', () => {
    expect(deriveCategoryOptions(results)).toHaveLength(2);
  });

  it('skips entries with no category', () => {
    const opts = deriveCategoryOptions([{ category: '', city: 'X', state: 'SP' }]);
    expect(opts).toHaveLength(0);
  });
});
