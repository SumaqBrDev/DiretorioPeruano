import { describe, expect, it } from 'vitest';

import { formatStatValue } from '../src/lib/businessDisplay';

describe('formatStatValue', () => {
  it('appends the suffix to a positive value', () => {
    expect(formatStatValue({ value: 12, suffix: '+' })).toBe('12+');
  });

  it('works without a suffix', () => {
    expect(formatStatValue({ value: 7, suffix: '' })).toBe('7');
  });

  /**
   * The regression: an empty directory rendered "0+", which reads as "more
   * than zero" and contradicted the empty listing shown directly below it.
   */
  it('never advertises "more than zero"', () => {
    expect(formatStatValue({ value: 0, suffix: '+' })).toBe('0');
  });

  it('keeps a plain zero when there is no suffix', () => {
    expect(formatStatValue({ value: 0, suffix: '' })).toBe('0');
  });

  it('treats a missing suffix as absent', () => {
    expect(formatStatValue({ value: 3 })).toBe('3');
  });

  it('never emits a suffix on any zero/suffix combination', () => {
    for (const suffix of ['+', '', undefined]) {
      expect(formatStatValue({ value: 0, suffix })).toBe('0');
    }
  });
});
