// tests/ad-status-presentation.test.ts
// Every ad status must present as human text, never as a raw backend token.
import { describe, it, expect } from 'vitest';
import { getAdStatusPresentation, AD_STATUS_TONE_CLASSES } from '../src/lib/adStatus';

// Mirrors the statuses the backend can store (schema + lib/adModeration).
const BACKEND_STATUSES = [
  'draft',
  'pending_payment',
  'pending_review',
  'inactive_for_review',
  'active',
  'rejected_final',
  'disabled_breach',
  'expired',
  'cancelled',
];

describe('ad status presentation', () => {
  it('gives every backend status a human label, never the raw token', () => {
    for (const status of BACKEND_STATUSES) {
      const p = getAdStatusPresentation(status);
      expect(p.label.length).toBeGreaterThan(0);
      // 'active' → 'Ativo': the label must not leak the internal value.
      expect(p.label).not.toBe(status);
    }
  });

  it('maps every status to a tone that has classes defined', () => {
    for (const status of BACKEND_STATUSES) {
      const p = getAdStatusPresentation(status);
      expect(AD_STATUS_TONE_CLASSES[p.tone]).toBeDefined();
      expect(AD_STATUS_TONE_CLASSES[p.tone].badge).toContain('bg-');
    }
  });

  // A new status must degrade to something visible, not a blank cell.
  it('falls back to the raw value for an unknown status instead of rendering nothing', () => {
    const p = getAdStatusPresentation('some_future_status');
    expect(p.label).toBe('some_future_status');
    expect(p.tone).toBe('neutral');
  });

  it('marks the states that need the advertiser to act', () => {
    expect(getAdStatusPresentation('inactive_for_review').tone).toBe('danger');
    expect(getAdStatusPresentation('pending_review').tone).toBe('warning');
    expect(getAdStatusPresentation('active').tone).toBe('success');
  });

  // The two terminal rejections differ on money, and the UI must not blur it.
  it('distinguishes a refunded termination from a breach without refund', () => {
    const final = getAdStatusPresentation('rejected_final');
    const breach = getAdStatusPresentation('disabled_breach');

    expect(final.hint).toMatch(/devolvid/i);
    expect(breach.hint).toMatch(/[Ss]em devolução/);
    expect(final.label).not.toBe(breach.label);
  });

  it('tells the owner a draft was never charged', () => {
    expect(getAdStatusPresentation('draft').hint).toMatch(/cobrado/i);
  });
});
