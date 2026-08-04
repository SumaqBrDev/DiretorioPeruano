// tests/cnpj.test.ts
import { describe, it, expect } from 'vitest';
import { isValidCnpjFormat, isValidCnpjDigits } from '../netlify/functions/lib/cnpj';

describe('isValidCnpjFormat', () => {
  it('accepts a well-formed formatted CNPJ', () => {
    expect(isValidCnpjFormat('11.222.333/0001-81')).toBe(true);
  });

  it('rejects a CNPJ with invalid check digits', () => {
    expect(isValidCnpjFormat('11.222.333/0001-82')).toBe(false);
  });

  it('rejects malformed input', () => {
    expect(isValidCnpjFormat('')).toBe(false);
    expect(isValidCnpjFormat('123')).toBe(false);
  });
});

describe('isValidCnpjDigits', () => {
  it('validates the digit-only form (mod 11)', () => {
    expect(isValidCnpjDigits('11222333000181')).toBe(true);
    expect(isValidCnpjDigits('11222333000182')).toBe(false);
  });
});
