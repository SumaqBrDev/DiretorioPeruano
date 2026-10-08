import { describe, it, expect } from 'vitest';
import { getBusinessStatusTone } from '../src/lib/businessStatus';

describe('getBusinessStatusTone', () => {
  it('returns emerald tone + "Aprovado" label for approved', () => {
    const tone = getBusinessStatusTone('approved');
    expect(tone.label).toBe('Aprovado');
    expect(tone.dotClass).toContain('emerald');
    expect(tone.badgeClass).toContain('emerald');
  });

  it('returns amber tone + "Pendente de Aprovação" label for pending', () => {
    const tone = getBusinessStatusTone('pending');
    expect(tone.label).toBe('Pendente de Aprovação');
    expect(tone.dotClass).toContain('amber');
  });

  it('treats a missing/empty status the same as pending', () => {
    expect(getBusinessStatusTone('').label).toBe('Pendente de Aprovação');
    expect(getBusinessStatusTone(undefined).label).toBe('Pendente de Aprovação');
  });

  it('returns rose tone + "Rejeitado" label for rejected', () => {
    const tone = getBusinessStatusTone('rejected');
    expect(tone.label).toBe('Rejeitado');
    expect(tone.dotClass).toContain('rose');
  });

  it('returns zinc tone + "Desabilitado" label for disabled', () => {
    const tone = getBusinessStatusTone('disabled');
    expect(tone.label).toBe('Desabilitado');
    expect(tone.dotClass).toContain('zinc');
  });

  it('falls back to a neutral zinc tone for an unknown status, echoing it as the label', () => {
    const tone = getBusinessStatusTone('archived');
    expect(tone.label).toBe('archived');
    expect(tone.dotClass).toContain('zinc');
  });
});
