import { describe, expect, it } from 'vitest';

import { normalizeSearchResults } from '../src/lib/businessDisplay';

describe('normalizeSearchResults', () => {
  it('keeps well-formed results untouched', () => {
    const rows = normalizeSearchResults([
      {
        id: 'a',
        name: 'Cantina',
        category: 'restaurante',
        city: 'São Paulo',
        state: 'SP',
        rating: 4.5,
        reviewsCount: 3,
        tags: ['peruano', 'ceviche'],
        coverImage: 'https://example.com/a.jpg',
        description: 'Comida peruana',
      },
    ]);

    expect(rows[0].tags).toEqual(['peruano', 'ceviche']);
    expect(rows[0].name).toBe('Cantina');
  });

  /**
   * The regression: a business saved without tags made the results list call
   * `.map` on undefined, which threw during render and blanked the entire
   * search page for every visitor — not just that one card.
   */
  it('substitutes an empty tag list when tags are missing', () => {
    const rows = normalizeSearchResults([{ id: 'a', name: 'Sem tags' } as never]);

    expect(rows[0].tags).toEqual([]);
    expect(() => rows[0].tags.map((t) => t)).not.toThrow();
  });

  it('survives null tags', () => {
    const rows = normalizeSearchResults([{ id: 'a', name: 'X', tags: null } as never]);
    expect(rows[0].tags).toEqual([]);
  });

  it('drops non-array tags instead of trusting them', () => {
    const rows = normalizeSearchResults([{ id: 'a', name: 'X', tags: 'peruano' } as never]);
    expect(rows[0].tags).toEqual([]);
  });

  it('defaults every field the results list reads', () => {
    const row = normalizeSearchResults([{ id: 'a' } as never])[0];

    expect(row.name).toBe('');
    expect(row.city).toBe('');
    expect(row.state).toBe('');
    expect(row.category).toBe('');
    expect(row.rating).toBe(0);
    expect(row.reviewsCount).toBe(0);
    expect(row.coverImage).toBe('');
    expect(row.description).toBe('');
  });

  it('tolerates a non-array payload', () => {
    expect(normalizeSearchResults(undefined as never)).toEqual([]);
    expect(normalizeSearchResults(null as never)).toEqual([]);
  });

  it('skips entries that are not objects', () => {
    const rows = normalizeSearchResults([null, 'x', { id: 'ok', name: 'Ok' }] as never);
    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Ok');
  });

  /** Nothing the results list iterates may ever be undefined. */
  it('never yields a row whose iterated field is undefined', () => {
    for (const raw of [{}, { tags: undefined }, { tags: null }, { tags: 7 }]) {
      const row = normalizeSearchResults([raw as never])[0];
      expect(Array.isArray(row.tags)).toBe(true);
    }
  });
});
