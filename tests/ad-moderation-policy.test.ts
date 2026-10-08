// tests/ad-moderation-policy.test.ts
import { describe, it, expect } from 'vitest';
import {
  MAX_REVIEW_ATTEMPTS,
  canUserAdvertise,
  resolveRejectionOutcome,
  resolveAdDisplayIdentity,
  buildAdPublicationTerms,
} from '../netlify/functions/lib/adModeration';

describe('canUserAdvertise', () => {
  // Ads are no longer welded to an approved business: any confirmed account
  // may advertise. "Confirmed" means a verified session with a verified email.
  it('allows a confirmed community user with no business', () => {
    const res = canUserAdvertise({ hasVerifiedEmail: true, business: null });
    expect(res.allowed).toBe(true);
  });

  it('allows a confirmed user who owns an approved business', () => {
    const res = canUserAdvertise({
      hasVerifiedEmail: true,
      business: { status: 'approved' },
    });
    expect(res.allowed).toBe(true);
  });

  it('rejects an unconfirmed account — a verified email is the floor', () => {
    const res = canUserAdvertise({ hasVerifiedEmail: false, business: null });
    expect(res.allowed).toBe(false);
    if (!res.allowed) expect(res.reason).toBe('email_not_verified');
  });

  // Subscription state is deliberately NOT consulted: ads are a complementary
  // product, not part of the monthly plan.
  it('allows advertising regardless of subscription status', () => {
    for (const subscriptionStatus of ['none', 'trial', 'active', 'canceled']) {
      const res = canUserAdvertise({
        hasVerifiedEmail: true,
        business: { status: 'approved', subscriptionStatus },
      });
      expect(res.allowed).toBe(true);
    }
  });

  // A business under moderation must not use ads to bypass its own review.
  it('rejects an owner whose business was disabled for abuse', () => {
    const res = canUserAdvertise({
      hasVerifiedEmail: true,
      business: { status: 'disabled' },
    });
    expect(res.allowed).toBe(false);
    if (!res.allowed) expect(res.reason).toBe('business_disabled');
  });
});

describe('resolveRejectionOutcome', () => {
  it('keeps the ad correctable on the first rejection', () => {
    const out = resolveRejectionOutcome({ previousAttempts: 0 });
    expect(out.status).toBe('inactive_for_review');
    expect(out.attemptsUsed).toBe(1);
    expect(out.attemptsRemaining).toBe(2);
    expect(out.refund).toBe(false);
    expect(out.terminal).toBe(false);
  });

  it('still allows one more correction on the second rejection', () => {
    const out = resolveRejectionOutcome({ previousAttempts: 1 });
    expect(out.status).toBe('inactive_for_review');
    expect(out.attemptsRemaining).toBe(1);
    expect(out.terminal).toBe(false);
  });

  // Third strike ends the ad. The money goes back: the ad was never published,
  // so no advertising service was ever delivered. Retaining payment for an
  // unperformed service is void under CDC art. 51, II regardless of any
  // accepted terms, so the deterrent is loss of access, not the R$30.
  it('terminates the ad and refunds on the third rejection', () => {
    const out = resolveRejectionOutcome({ previousAttempts: 2 });
    expect(out.status).toBe('rejected_final');
    expect(out.attemptsUsed).toBe(MAX_REVIEW_ATTEMPTS);
    expect(out.attemptsRemaining).toBe(0);
    expect(out.refund).toBe(true);
    expect(out.terminal).toBe(true);
  });

  it('never grants a fourth attempt or double-refunds', () => {
    const out = resolveRejectionOutcome({ previousAttempts: 5 });
    expect(out.status).toBe('rejected_final');
    expect(out.attemptsRemaining).toBe(0);
    expect(out.terminal).toBe(true);
  });

  // An ad that WAS published and then found in breach is the one case where
  // no refund is due: the exhibition actually happened.
  it('disables a published ad with no refund when it breaches after going live', () => {
    const out = resolveRejectionOutcome({ previousAttempts: 0, wasPublished: true });
    expect(out.status).toBe('disabled_breach');
    expect(out.refund).toBe(false);
    expect(out.terminal).toBe(true);
  });
});

describe('resolveAdDisplayIdentity', () => {
  // A business ad borrows the listing's identity, as it does today.
  it('uses the business identity when the ad belongs to a business', () => {
    const id = resolveAdDisplayIdentity({
      business: { id: 'biz-1', name: 'Chicheria', category: 'food', rating: 4.5, photos: ['b.jpg'] },
      user: { name: 'Ignored' },
      ad: { imageUrl: null, targetUrl: null },
    });
    expect(id.displayName).toBe('Chicheria');
    expect(id.category).toBe('food');
    expect(id.imageUrl).toBe('b.jpg');
    expect(id.targetUrl).toBe('/negocio/biz-1');
  });

  // A community ad has no listing to borrow from, so its own image and link
  // are the only source — and there is no category or rating to show.
  it('uses the ad\'s own media and link for a community ad', () => {
    const id = resolveAdDisplayIdentity({
      business: null,
      user: { name: 'José R.' },
      ad: { imageUrl: 'own.jpg', targetUrl: 'https://example.com' },
    });
    expect(id.displayName).toBe('José R.');
    expect(id.imageUrl).toBe('own.jpg');
    expect(id.targetUrl).toBe('https://example.com');
    expect(id.category).toBeNull();
    expect(id.rating).toBeNull();
  });

  it('never invents a rating for a community ad', () => {
    const id = resolveAdDisplayIdentity({
      business: null,
      user: { name: 'Ana' },
      ad: { imageUrl: 'a.jpg', targetUrl: 'https://a.test' },
    });
    expect(id.rating).toBeNull();
  });

  it('falls back to a neutral label when a community user has no name', () => {
    const id = resolveAdDisplayIdentity({
      business: null,
      user: { name: null },
      ad: { imageUrl: 'a.jpg', targetUrl: 'https://a.test' },
    });
    expect(id.displayName.length).toBeGreaterThan(0);
  });

  // BusinessProfile.name is nullable in the schema, so this is a real row
  // shape and must never render as an empty advertiser name.
  it('falls back to a neutral label when a business has no name', () => {
    const id = resolveAdDisplayIdentity({
      business: { id: 'biz-9', name: null, category: 'food', rating: 4, photos: ['p.jpg'] },
      user: null,
      ad: { imageUrl: null, targetUrl: null },
    });
    expect(id.displayName.length).toBeGreaterThan(0);
    expect(id.targetUrl).toBe('/negocio/biz-9');
  });
});

describe('buildAdPublicationTerms', () => {
  const terms = buildAdPublicationTerms();

  it('states the review requirement, the attempt limit and the refund rule', () => {
    const text = terms.sections.map((s) => `${s.title} ${s.body}`).join(' ');
    expect(text).toMatch(/revis/i);
    expect(text).toMatch(/3/);
    // The honest rule must be stated: a never-published ad is refunded.
    expect(text).toMatch(/reembols|devoluç/i);
  });

  it('warns that a published ad in breach is disabled without refund', () => {
    const text = terms.sections.map((s) => s.body).join(' ');
    expect(text).toMatch(/sem reembolso|sem devolu/i);
  });

  it('is versioned so an acceptance can be tied to the text shown', () => {
    expect(terms.version).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('never promises to keep money for an unpublished ad', () => {
    const text = terms.sections.map((s) => s.body).join(' ').toLowerCase();
    // Guard against reintroducing the void clause: "no refund under any
    // circumstance" would be nullified by CDC art. 51, II.
    expect(text).not.toMatch(/em nenhuma hipótese.*reembolso/);
  });
});
