// tests/ad-terms-endpoint.test.ts
// The terms endpoint is the single source of truth the form must agree with:
// ad-checkout rejects any submission whose accepted version differs from the
// one served here, so a drift between the two silently blocks every ad.
import { describe, it, expect } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';
import { handler } from '../netlify/functions/ad-terms';
import { buildAdPublicationTerms } from '../netlify/functions/lib/adModeration';

const get = () => ({ httpMethod: 'GET', headers: {} }) as unknown as HandlerEvent;

describe('ad-terms endpoint', () => {
  it('serves the exact terms ad-checkout validates against', async () => {
    const res = await handler(get());
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    // Same object the checkout compares with — no second copy to drift.
    expect(body.version).toBe(buildAdPublicationTerms().version);
    expect(body.sections.length).toBeGreaterThan(0);
    expect(body.acknowledgement.length).toBeGreaterThan(0);
  });

  it('is readable without authentication', async () => {
    // Rules a user must accept cannot be behind a login: they have to be
    // readable before committing to anything.
    const res = await handler(get());
    expect(res.statusCode).toBe(200);
  });

  it('rejects non-GET methods', async () => {
    const res = await handler({ httpMethod: 'POST', headers: {} } as unknown as HandlerEvent);
    expect(res.statusCode).toBe(405);
  });

  it('states the refund rule honestly in the served text', async () => {
    const res = await handler(get());
    const text = JSON.parse(res.body)
      .sections.map((s: { body: string }) => s.body)
      .join(' ');

    // A never-published ad is refunded; promising otherwise would be void
    // under CDC art. 51, II and expose the site rather than protect it.
    expect(text).toMatch(/devol/i);
  });
});
