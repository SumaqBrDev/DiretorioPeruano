// tests/business-hours.test.ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_BUSINESS_HOURS,
  formatBusinessHoursForDisplay,
  normalizeBusinessHours,
  validateBusinessHours,
  type BusinessHours,
} from '../src/lib/businessHours';

const validHours = (): BusinessHours =>
  DEFAULT_BUSINESS_HOURS.map((entry) => ({ ...entry, isOpen: true, open: '09:00', close: '18:00' }));

describe('business hours validation', () => {
  it('accepts seven valid day entries', () => {
    const hours = validHours();

    expect(validateBusinessHours(hours)).toEqual({ valid: true, errors: [] });
    expect(normalizeBusinessHours(hours)).toEqual(hours);
  });

  it('allows a closed day without usable times', () => {
    const hours = validHours();
    hours[6] = { day: 'Domingo', isOpen: false, open: '25:99', close: '' };

    expect(validateBusinessHours(hours)).toEqual({ valid: true, errors: [] });
    expect(normalizeBusinessHours(hours)?.[6]).toEqual({
      day: 'Domingo',
      isOpen: false,
      open: '',
      close: '',
    });
  });

  it('rejects malformed times and invalid ranges for open days', () => {
    const malformed = validHours();
    malformed[0] = { ...malformed[0], open: '9:00' };

    const invalidRange = validHours();
    invalidRange[1] = { ...invalidRange[1], open: '18:00', close: '09:00' };

    expect(validateBusinessHours(malformed)).toEqual({
      valid: false,
      errors: ['Segunda: horário de abertura inválido. Use HH:mm.'],
    });
    expect(validateBusinessHours(invalidRange)).toEqual({
      valid: false,
      errors: ['Terça: horário de abertura deve ser antes do fechamento.'],
    });
    expect(normalizeBusinessHours(malformed)).toBeNull();
    expect(normalizeBusinessHours(invalidRange)).toBeNull();
  });

  it('handles null input as no saved hours', () => {
    expect(validateBusinessHours(null)).toEqual({ valid: true, errors: [] });
    expect(normalizeBusinessHours(null)).toBeNull();
    expect(formatBusinessHoursForDisplay(null)).toEqual([]);
  });

  it('formats closed days as Fechado for display', () => {
    const hours = validHours();
    hours[2] = { day: 'Quarta', isOpen: false, open: '', close: '' };

    expect(formatBusinessHoursForDisplay(hours)[2]).toEqual({ day: 'Quarta', hours: 'Fechado' });
  });
});
