// tests/legal-docs.test.ts
// Strict TDD (WU2b task 2.3): RED-first handler tests for the PUBLIC legal
// documents endpoint (netlify/functions/legal-docs.ts).
//
// Acceptance criteria (spec #229): Legal document registry/Active version
// resolution — clients request the active version and receive it with hash,
// purposes, and legal bases; future-dated versions are never returned.
// Design contract: GET /api/legal-docs is PUBLIC (no auth) and returns the
// active registry as METADATA ONLY (id, version, effectiveDate, hash,
// purposes, legalBases, locale) — no section wording, no internal flags.

import { describe, it, expect } from 'vitest';

import { handler } from '../netlify/functions/legal-docs';
import { activeLegalDocs } from '../src/config/legal';

function event(method = 'GET') {
  return { httpMethod: method };
}

describe('GET /api/legal-docs — public active legal registry', () => {
  it('is PUBLIC: returns 200 without any authentication', async () => {
    const res = await handler(event('GET'));

    expect(res.statusCode).toBe(200);
    expect(Array.isArray(JSON.parse(res.body).documents)).toBe(true);
  });

  it('returns exactly the ACTIVE registry entries (metadata only)', async () => {
    const res = await handler(event('GET'));

    const { documents } = JSON.parse(res.body);
    const expected = activeLegalDocs().map((d) => ({
      id: d.id,
      version: d.version,
      effectiveDate: d.effectiveDate,
      hash: d.hash,
      purposes: d.purposes,
      legalBases: d.legalBases,
      locale: d.locale,
    }));
    expect(documents).toEqual(expected);
  });

  it('never includes section wording or internal registry fields', async () => {
    const res = await handler(event('GET'));

    const { documents } = JSON.parse(res.body);
    for (const doc of documents) {
      expect(Object.keys(doc).sort()).toEqual(
        ['effectiveDate', 'hash', 'id', 'legalBases', 'locale', 'purposes', 'version']
      );
    }
    expect(JSON.stringify(documents)).not.toContain('PLACEHOLDER');
    expect(JSON.stringify(documents)).not.toContain('sections');
    expect(JSON.stringify(documents)).not.toContain('titleKey');
    expect(JSON.stringify(documents)).not.toContain('legalApproved');
  });

  it('returns only versions effective today or earlier (no future-dated entries)', async () => {
    const res = await handler(event('GET'));

    const { documents } = JSON.parse(res.body);
    for (const doc of documents) {
      expect(new Date(`${doc.effectiveDate}T00:00:00Z`).getTime()).toBeLessThanOrEqual(Date.now());
    }
  });

  it('returns 405 for non-GET methods', async () => {
    const res = await handler(event('POST'));

    expect(res.statusCode).toBe(405);
    expect((res.headers as Record<string, string>).Allow).toContain('GET');
  });
});
