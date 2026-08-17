// tests/consent-admin.test.ts
// Strict TDD (WU2b task 2.3): RED-first handler tests for the governance
// admin view (netlify/functions/consent-admin.ts).
//
// Acceptance criteria (spec #229): Observability and admin governance view —
// superadmin-only read view; subject id only, no PII beyond the subject.
// Design contract: GET /api/consent/admin — requireSuperAdmin, paginated,
// filters by documentType/source. Envelope { error, code? } (D6).

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    consentRecord: { findMany: vi.fn(), count: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  requireSuperAdmin: vi.fn(),
}));

import { handler } from '../netlify/functions/consent-admin';
import prisma from '../netlify/functions/lib/prisma';
import { requireSuperAdmin } from '../netlify/functions/lib/auth';

const superAdminMock = vi.mocked(requireSuperAdmin);
const findManyMock = vi.mocked(prisma.consentRecord.findMany);
const countMock = vi.mocked(prisma.consentRecord.count);

function adminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    userId: 'user-A',
    documentType: 'cookie_policy',
    documentVersion: '1',
    documentHash: '897c9bd23dc02848eec9d7f33380771f47629d38cab0beb333ed3e915fb416b3',
    purpose: 'analytics',
    legalBasis: 'consent',
    intent: 'grant',
    granted: true,
    consentedAt: new Date('2026-08-17T10:00:00Z'),
    revokedAt: null,
    source: 'settings',
    locale: 'pt-BR',
    idempotencyKey: 'idem-1',
    createdAt: new Date('2026-08-17T10:00:00Z'),
    // PII that must NEVER reach the governance view (subject id only).
    email: 'victim@example.com',
    name: 'Victim Name',
    ...overrides,
  };
}

describe('GET /api/consent/admin — governance read view (superadmin only)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    superAdminMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_sa', claims: {} } as any);
    countMock.mockResolvedValue(1);
    findManyMock.mockResolvedValue([adminRow()] as any);
  });

  it('returns 401 when the request is unauthenticated', async () => {
    superAdminMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' } as any);

    const res = await handler({ httpMethod: 'GET', queryStringParameters: {} });

    expect(res.statusCode).toBe(401);
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('returns 403 for an authenticated NON-superadmin', async () => {
    superAdminMock.mockResolvedValue({ ok: false, statusCode: 403, error: 'Acceso denegado — se requiere rol superadmin' } as any);

    const res = await handler({ httpMethod: 'GET', queryStringParameters: {} });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toContain('superadmin');
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('returns the paginated governance view for a superadmin', async () => {
    const res = await handler({ httpMethod: 'GET', queryStringParameters: {} });

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.total).toBe(1);
    expect(body.page).toBe(1);
    expect(body.pageSize).toBe(50);
    expect(body.records).toHaveLength(1);
    expect(findManyMock).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
    });
  });

  it('applies documentType and source filters from the query string', async () => {
    await handler({
      httpMethod: 'GET',
      queryStringParameters: { documentType: 'cookie_policy', source: 'settings' },
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: { documentType: 'cookie_policy', source: 'settings' },
      orderBy: { createdAt: 'desc' },
      skip: 0,
      take: 50,
    });
  });

  it('honors page/pageSize pagination', async () => {
    await handler({
      httpMethod: 'GET',
      queryStringParameters: { page: '3', pageSize: '10' },
    });

    expect(findManyMock).toHaveBeenCalledWith({
      where: {},
      orderBy: { createdAt: 'desc' },
      skip: 20,
      take: 10,
    });
  });

  it('rejects an unknown documentType filter with 422 INVALID_PAYLOAD', async () => {
    const res = await handler({
      httpMethod: 'GET',
      queryStringParameters: { documentType: 'no_such_doc' },
    });

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).code).toBe('INVALID_PAYLOAD');
    expect(countMock).not.toHaveBeenCalled();
    expect(findManyMock).not.toHaveBeenCalled();
  });

  it('never exposes PII beyond the subject id', async () => {
    const res = await handler({ httpMethod: 'GET', queryStringParameters: {} });

    const body = JSON.parse(res.body);
    expect(body.records[0].userId).toBe('user-A');
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('victim@example.com');
    expect(serialized).not.toContain('Victim Name');
    expect(serialized).not.toContain('"email"');
    expect(serialized).not.toContain('"name"');
  });

  it('returns 405 for non-GET methods', async () => {
    const res = await handler({ httpMethod: 'POST', body: '{}' });

    expect(res.statusCode).toBe(405);
    expect((res.headers as Record<string, string>).Allow).toContain('GET');
  });
});
