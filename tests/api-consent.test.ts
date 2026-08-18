// tests/api-consent.test.ts
// Strict TDD (WU3 task 3.5): RED-first tests for the consent client additions
// in src/lib/api.ts:
//   - ApiError.code parsed from the {error, code?} envelope (D6)
//   - recordConsent(): POST /.netlify/functions/consent
//   - getConsentStatus(): GET /.netlify/functions/consent/status
// Pure node-env tests: global fetch is stubbed; no DOM, no jsdom.

import { describe, it, expect, vi, afterEach } from 'vitest';

import { ApiError, recordConsent, getConsentStatus } from '../src/lib/api';

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ApiError.code — machine-readable code from {error, code?} envelope (D6)', () => {
  it('exposes the server code on non-2xx responses', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(422, { error: 'Payload inválido', code: 'INVALID_PAYLOAD' })
    );
    vi.stubGlobal('fetch', fetchMock);

    try {
      await recordConsent('tok', {
        documentType: 'terms_of_service',
        documentVersion: '1',
        purpose: 'service',
        legalBasis: 'contract',
        source: 'onboarding',
        locale: 'pt-BR',
        granted: true,
        idempotencyKey: 'k1',
      });
      expect.unreachable('recordConsent should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ApiError);
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(422);
      expect(apiErr.code).toBe('INVALID_PAYLOAD');
    }
  });

  it('keeps code undefined when the error body has no code (backward compatible)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(500, { error: 'Erro interno' }));
    vi.stubGlobal('fetch', fetchMock);

    try {
      await getConsentStatus('tok');
      expect.unreachable('getConsentStatus should have thrown');
    } catch (err) {
      const apiErr = err as ApiError;
      expect(apiErr.statusCode).toBe(500);
      expect(apiErr.code).toBeUndefined();
    }
  });
});

describe('recordConsent — POST /api/consent', () => {
  it('posts the full body to /.netlify/functions/consent with bearer token', async () => {
    const record = { id: 'rec-1', documentType: 'terms_of_service' };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, { record }));
    vi.stubGlobal('fetch', fetchMock);

    const input = {
      documentType: 'terms_of_service',
      documentVersion: '1',
      purpose: 'service',
      legalBasis: 'contract',
      source: 'onboarding',
      locale: 'pt-BR',
      granted: true,
      idempotencyKey: 'signup-123-terms',
    };
    const result = await recordConsent('tok-abc', input);

    expect(result.record).toEqual(record);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/.netlify/functions/consent');
    expect(init.method).toBe('POST');
    expect(init.headers['Content-Type']).toBe('application/json');
    expect(init.headers.Authorization).toBe('Bearer tok-abc');
    expect(JSON.parse(init.body)).toEqual(input);
  });

  it('returns the duplicate flag on 200 (idempotent duplicate submit)', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { record: { id: 'rec-1' }, duplicate: true })
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await recordConsent('tok', {
      documentType: 'privacy_policy',
      documentVersion: '2',
      purpose: 'service',
      legalBasis: 'contract',
      source: 'onboarding',
      locale: 'pt-BR',
      granted: true,
      idempotencyKey: 'k2',
    });
    expect(result.duplicate).toBe(true);
    expect(result.record.id).toBe('rec-1');
  });
});

describe('getConsentStatus — GET /api/consent/status', () => {
  it('calls /.netlify/functions/consent/status and returns the state', async () => {
    const state = {
      mandatoryCurrent: false,
      current: [
        { documentType: 'privacy_policy', version: '1', granted: true, consentedAt: '2026-08-01T00:00:00Z' },
      ],
      requiredDocs: ['privacy_policy', 'terms_of_service'],
    };
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, state));
    vi.stubGlobal('fetch', fetchMock);

    const result = await getConsentStatus('tok-xyz');

    expect(result).toEqual(state);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('/.netlify/functions/consent/status');
    expect(init.method).toBe('GET');
    expect(init.headers.Authorization).toBe('Bearer tok-xyz');
  });
});
