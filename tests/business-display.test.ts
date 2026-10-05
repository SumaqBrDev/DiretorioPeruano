import { describe, expect, it } from 'vitest';

import {
  formatBusinessAddress,
  getContactRows,
  formatCategoryCount,
} from '../src/lib/businessDisplay';

describe('formatBusinessAddress', () => {
  it('joins the parts that are present', () => {
    expect(
      formatBusinessAddress({
        street: 'Rua Augusta, 1234',
        city: 'São Paulo',
        state: 'SP',
        zip: '01304-001',
      })
    ).toBe('Rua Augusta, 1234, São Paulo - SP, 01304-001');
  });

  /**
   * The regression: a blank zip used to produce a trailing empty segment, and
   * a street already containing the city repeated it, yielding
   * "Rua Augusta, 1234, São Paulo - SP, , São Paulo - SP".
   */
  it('drops empty segments instead of emitting a bare comma', () => {
    const formatted = formatBusinessAddress({
      street: 'Rua Augusta, 1234',
      city: 'São Paulo',
      state: 'SP',
      zip: '',
    });

    expect(formatted).toBe('Rua Augusta, 1234, São Paulo - SP');
    expect(formatted).not.toContain(', ,');
    expect(formatted).not.toMatch(/,\s*$/);
  });

  it('never repeats the city and state already spelled out in the street', () => {
    const formatted = formatBusinessAddress({
      street: 'Rua Augusta, 1234, São Paulo - SP',
      city: 'São Paulo',
      state: 'SP',
      zip: '',
    });

    expect(formatted).toBe('Rua Augusta, 1234, São Paulo - SP');
  });

  it('treats whitespace-only fields as absent', () => {
    expect(
      formatBusinessAddress({ street: '  ', city: 'Lima', state: '', zip: '  ' })
    ).toBe('Lima');
  });

  it('returns an empty string when nothing is known', () => {
    expect(formatBusinessAddress({ street: '', city: '', state: '', zip: '' })).toBe('');
  });

  it('tolerates a missing address object', () => {
    expect(formatBusinessAddress(undefined)).toBe('');
  });
});

describe('getContactRows', () => {
  it('returns only the channels that carry a value', () => {
    const rows = getContactRows({
      address: 'Rua Augusta, 1234',
      phone: '+55 11 91234-5678',
      whatsapp: '',
      email: '',
      website: 'https://example.com',
    });

    expect(rows.map((r) => r.kind)).toEqual(['address', 'phone', 'website']);
  });

  /** The regression: an empty email rendered its icon with no value beside it. */
  it('omits an empty email row entirely', () => {
    const rows = getContactRows({
      address: '',
      phone: '',
      whatsapp: '',
      email: '',
      website: '',
    });

    expect(rows).toEqual([]);
  });

  it('omits whitespace-only values', () => {
    const rows = getContactRows({
      address: '  ',
      phone: '\t',
      whatsapp: '',
      email: '   ',
      website: '',
    });

    expect(rows).toEqual([]);
  });

  it('keeps a real email', () => {
    const rows = getContactRows({
      address: '',
      phone: '',
      whatsapp: '',
      email: 'contato@example.com',
      website: '',
    });

    expect(rows).toEqual([{ kind: 'email', value: 'contato@example.com' }]);
  });
});

describe('formatCategoryCount', () => {
  /**
   * The regression: a category with listings rendered "3 em breve", because the
   * count was concatenated with the coming-soon label.
   */
  it('labels a populated category with its listing count, never "coming soon"', () => {
    expect(formatCategoryCount({ count: 3, comingSoonLabel: 'Em breve', listingsLabel: 'negócios' })).toBe(
      '3 negócios'
    );
  });

  it('uses the singular listings label for exactly one listing', () => {
    expect(
      formatCategoryCount({ count: 1, comingSoonLabel: 'Em breve', listingsLabel: 'negócios', singularLabel: 'negócio' })
    ).toBe('1 negócio');
  });

  it('shows the coming-soon label only when the category is empty', () => {
    expect(formatCategoryCount({ count: 0, comingSoonLabel: 'Em breve', listingsLabel: 'negócios' })).toBe(
      'Em breve'
    );
  });

  it('never mixes a count with the coming-soon label', () => {
    for (const count of [0, 1, 2, 10]) {
      const label = formatCategoryCount({
        count,
        comingSoonLabel: 'Em breve',
        listingsLabel: 'negócios',
      });
      if (count > 0) expect(label).not.toContain('Em breve');
    }
  });
});
