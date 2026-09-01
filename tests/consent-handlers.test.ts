// tests/consent-handlers.test.ts
// Strict TDD (WU2b task 2.3): RED-first handler tests for the consent API
// endpoints (netlify/functions/consent.ts POST record + GET history + GET
// status, consent-revoke.ts, consent-export.ts, consent-preferences.ts).
//
// Acceptance criteria (spec #229): consent-api/* (record own consent,
// cross-user targeting 403, query own history, revoke mandatory while active
// rejected, user provisioning upsert) and consent-rights-preferences/Export
// (own data only, no password hashes).
//
// Handler wiring uses the repo convention (tests/businesses.test.ts pattern):
// vi.mock of lib/prisma + lib/auth; the core lib (lib/consent.ts) receives the
// mocked prisma via injected deps.
//
// Error envelope (design D6): { error: string, code?: string }.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { upsert: vi.fn(), findUnique: vi.fn() },
    consentRecord: { findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn() },
    cookiePreference: { findMany: vi.fn(), findUnique: vi.fn(), upsert: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

import { handler as consentHandler } from '../netlify/functions/consent';
import { handler as revokeHandler } from '../netlify/functions/consent-revoke';
import { handler as exportHandler } from '../netlify/functions/consent-export';
import { handler as preferencesHandler } from '../netlify/functions/consent-preferences';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const userUpsertMock = vi.mocked(prisma.user.upsert);
const userFindUniqueMock = vi.mocked(prisma.user.findUnique);
const recordFindFirstMock = vi.mocked(prisma.consentRecord.findFirst);
const recordFindManyMock = vi.mocked(prisma.consentRecord.findMany);
const recordCreateMock = vi.mocked(prisma.consentRecord.create);
const prefFindManyMock = vi.mocked(prisma.cookiePreference.findMany);
const prefFindUniqueMock = vi.mocked(prisma.cookiePreference.findUnique);
const prefUpsertMock = vi.mocked(prisma.cookiePreference.upsert);

// Server-derived subject: verified Clerk token maps to user 'user-A' via the
// upsert in ensureUserByClerkId (design D4). The body NEVER selects the
// subject — it can only MATCH the server-derived id.
const USER_A = {
  id: 'user-A',
  clerkId: 'user_clerk_1',
  email: 'ana@example.com',
  name: 'Ana Lima',
  role: 'consumer',
};

function consentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-1',
    userId: 'user-A',
    documentType: 'terms_of_service',
    documentVersion: '1',
    documentHash: '7953fa0bc4f8cb28868e5681034476ba10425f3b8361a82da43de1510dfc270c',
    purpose: 'service',
    legalBasis: 'contract',
    intent: 'grant',
    granted: true,
    consentedAt: new Date('2026-08-17T10:00:00Z'),
    revokedAt: null,
    source: 'onboarding',
    locale: 'pt-BR',
    idempotencyKey: 'idem-1',
    createdAt: new Date('2026-08-17T10:00:00Z'),
    ...overrides,
  };
}

function prefRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'pref-1',
    userId: 'user-A',
    policyVersion: '1',
    categories: { analytics: true, marketing: false },
    locale: 'pt-BR',
    createdAt: new Date('2026-08-17T10:00:00Z'),
    updatedAt: new Date('2026-08-17T10:00:00Z'),
    ...overrides,
  };
}

function authEvent(path = '/api/consent', overrides: Record<string, unknown> = {}) {
  return { httpMethod: 'POST', path, body: '{}', ...overrides };
}

const validRecordBody = {
  documentType: 'terms_of_service',
  purpose: 'service',
  legalBasis: 'contract',
  source: 'onboarding',
  locale: 'pt-BR',
  idempotencyKey: 'idem-1',
};

describe('POST /api/consent — record own consent', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: { clerkId: 'user_clerk_1', email: 'ana@example.com' } } as any);
    userUpsertMock.mockResolvedValue(USER_A as any);
    recordFindFirstMock.mockResolvedValue(null);
    recordCreateMock.mockImplementation((args: any) =>
      Promise.resolve({ id: 'row-new', ...args.data }) as any
    );
  });

  it('records a grant for the server-derived subject → 201 with the evidence row', async () => {
    const res = await consentHandler(
      authEvent('/api/consent', { body: JSON.stringify(validRecordBody) })
    );

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.record.documentType).toBe('terms_of_service');
    expect(body.record.documentVersion).toBe('2');
    expect(body.record.granted).toBe(true);
    // Subject derived from the verified token, never from the body.
    const data = recordCreateMock.mock.calls[0][0].data;
    expect(data.userId).toBe('user-A');
    expect(recordCreateMock).toHaveBeenCalledTimes(1);
  });

  it('accepts a body.userId that MATCHES the server-derived subject (still server-derived)', async () => {
    const res = await consentHandler(
      authEvent('/api/consent', {
        body: JSON.stringify({ ...validRecordBody, userId: 'user-A' }),
      })
    );

    expect(res.statusCode).toBe(201);
    const data = recordCreateMock.mock.calls[0][0].data;
    expect(data.userId).toBe('user-A');
  });

  it('rejects a duplicate submit with 200 {record, duplicate:true} and no second row', async () => {
    const existing = consentRow({ id: 'row-existing' });
    recordFindFirstMock.mockResolvedValue(existing);

    const res = await consentHandler(
      authEvent('/api/consent', { body: JSON.stringify(validRecordBody) })
    );

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.duplicate).toBe(true);
    expect(body.record.id).toBe('row-existing');
    expect(recordCreateMock).not.toHaveBeenCalled();
  });

  it('rejects body.userId targeting ANOTHER user with 403 CROSS_USER_TARGETING and records nothing', async () => {
    const res = await consentHandler(
      authEvent('/api/consent', {
        body: JSON.stringify({ ...validRecordBody, userId: 'user-B' }),
      })
    );

    expect(res.statusCode).toBe(403);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('CROSS_USER_TARGETING');
    expect(body.error).toBeTruthy();
    expect(recordFindFirstMock).not.toHaveBeenCalled();
    expect(recordCreateMock).not.toHaveBeenCalled();
  });

  it('rejects an invalid payload with 422 INVALID_PAYLOAD (unknown documentType)', async () => {
    const res = await consentHandler(
      authEvent('/api/consent', {
        body: JSON.stringify({ ...validRecordBody, documentType: 'no_such_doc' }),
      })
    );

    expect(res.statusCode).toBe(422);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('INVALID_PAYLOAD');
    expect(body.error).toContain('no_such_doc');
    expect(recordCreateMock).not.toHaveBeenCalled();
  });

  it('rejects a payload missing required fields with 422 INVALID_PAYLOAD', async () => {
    const { source: _omit, ...noSource } = validRecordBody;
    const res = await consentHandler(
      authEvent('/api/consent', { body: JSON.stringify(noSource) })
    );

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).code).toBe('INVALID_PAYLOAD');
    expect(recordCreateMock).not.toHaveBeenCalled();
  });

  it('returns 401 and records nothing when unauthenticated', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado — token requerido' } as any);

    const res = await consentHandler(
      authEvent('/api/consent', { body: JSON.stringify(validRecordBody) })
    );

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBeTruthy();
    expect(userUpsertMock).not.toHaveBeenCalled();
    expect(recordCreateMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/consent — query own history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: {} } as any);
    userUpsertMock.mockResolvedValue(USER_A as any);
    recordFindManyMock.mockResolvedValue([consentRow({ id: 'r2' }), consentRow({ id: 'r1' })] as any);
  });

  it('returns only the authenticated subject rows, newest first', async () => {
    const res = await consentHandler(authEvent('/api/consent', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.records).toHaveLength(2);
    expect(body.records[0].id).toBe('r2');
    expect(recordFindManyMock).toHaveBeenCalledWith({
      where: { userId: 'user-A' },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' } as any);

    const res = await consentHandler(authEvent('/api/consent', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(401);
    expect(recordFindManyMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/consent/status — current mandatory consent state', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: {} } as any);
    userUpsertMock.mockResolvedValue(USER_A as any);
    userFindUniqueMock.mockResolvedValue(USER_A as any);
  });

  it('reports mandatoryCurrent true when the latest service rows are current', async () => {
    recordFindManyMock.mockResolvedValue([
      consentRow({ documentType: 'privacy_policy', documentVersion: '3', purpose: 'service', granted: true }),
      consentRow({ documentType: 'terms_of_service', documentVersion: '2', purpose: 'service', granted: true }),
      consentRow({ documentType: 'cookie_policy', documentVersion: '2', purpose: 'analytics', granted: true }),
    ] as any);

    const res = await consentHandler(authEvent('/api/consent/status', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.mandatoryCurrent).toBe(true);
    expect(body.requiredDocs).toEqual([]);
    expect(body.current).toHaveLength(3);
    expect(body.current[0]).toMatchObject({
      documentType: 'privacy_policy',
      version: '3',
      granted: true,
    });
    expect(body.current[0].consentedAt).toBeTruthy();
  });

  it('reports mandatoryCurrent false with requiredDocs when mandatory consent is stale/missing', async () => {
    recordFindManyMock.mockResolvedValue([
      consentRow({ documentType: 'cookie_policy', documentVersion: '1', purpose: 'analytics', granted: true }),
    ] as any);

    const res = await consentHandler(authEvent('/api/consent/status', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.mandatoryCurrent).toBe(false);
    expect(body.requiredDocs).toEqual(['privacy_policy', 'terms_of_service']);
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' } as any);

    const res = await consentHandler(authEvent('/api/consent/status', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(401);
  });
});

describe('POST /api/consent/revoke — optional-only revocation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: {} } as any);
    userUpsertMock.mockResolvedValue(USER_A as any);
    recordFindFirstMock.mockResolvedValue(null);
    recordCreateMock.mockImplementation((args: any) =>
      Promise.resolve({ id: 'row-rev', ...args.data }) as any
    );
  });

  it('revokes an OPTIONAL consent → 201 with granted=false appended', async () => {
    const res = await revokeHandler(
      authEvent('/api/consent/revoke', {
        body: JSON.stringify({ documentType: 'cookie_policy', purpose: 'analytics', idempotencyKey: 'rev-1' }),
      })
    );

    expect(res.statusCode).toBe(201);
    const body = JSON.parse(res.body);
    expect(body.record.documentType).toBe('cookie_policy');
    expect(body.record.granted).toBe(false);
    const data = recordCreateMock.mock.calls[0][0].data;
    expect(data.userId).toBe('user-A');
    expect(data.intent).toBe('revoke');
  });

  it('rejects revoking the MANDATORY service consent → 409 MANDATORY_NOT_REVOCABLE', async () => {
    const res = await revokeHandler(
      authEvent('/api/consent/revoke', {
        body: JSON.stringify({ documentType: 'terms_of_service', purpose: 'service', idempotencyKey: 'rev-2' }),
      })
    );

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('MANDATORY_NOT_REVOCABLE');
    expect(recordCreateMock).not.toHaveBeenCalled();
  });

  it('rejects an unknown document → 404 DOCUMENT_NOT_FOUND', async () => {
    const res = await revokeHandler(
      authEvent('/api/consent/revoke', {
        body: JSON.stringify({ documentType: 'no_such_doc', purpose: 'analytics', idempotencyKey: 'rev-3' }),
      })
    );

    expect(res.statusCode).toBe(404);
    expect(JSON.parse(res.body).code).toBe('DOCUMENT_NOT_FOUND');
    expect(recordCreateMock).not.toHaveBeenCalled();
  });

  it('rejects cross-user targeting with 403 CROSS_USER_TARGETING', async () => {
    const res = await revokeHandler(
      authEvent('/api/consent/revoke', {
        body: JSON.stringify({ documentType: 'cookie_policy', purpose: 'analytics', idempotencyKey: 'rev-4', userId: 'user-B' }),
      })
    );

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).code).toBe('CROSS_USER_TARGETING');
    expect(recordCreateMock).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' } as any);

    const res = await revokeHandler(
      authEvent('/api/consent/revoke', {
        body: JSON.stringify({ documentType: 'cookie_policy', purpose: 'analytics', idempotencyKey: 'rev-5' }),
      })
    );

    expect(res.statusCode).toBe(401);
    expect(recordCreateMock).not.toHaveBeenCalled();
  });
});

describe('GET /api/consent/export — own personal data + consent history', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: {} } as any);
    userUpsertMock.mockResolvedValue({
      ...USER_A,
      role: 'superadmin',
      stripeCustomerId: 'cus_x',
      passwordHash: 'not-really-a-hash',
    } as any);
    recordFindManyMock.mockResolvedValue([consentRow({ id: 'c1' })] as any);
    prefFindManyMock.mockResolvedValue([prefRow()] as any);
  });

  it('returns own profile + consents + preferences only', async () => {
    const res = await exportHandler(authEvent('/api/consent/export', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.profile).toEqual({ id: 'user-A', email: 'ana@example.com', name: 'Ana Lima' });
    expect(body.consents).toHaveLength(1);
    expect(body.cookiePreferences).toHaveLength(1);
    // Own data only: both queries are scoped to the server-derived subject.
    expect(recordFindManyMock).toHaveBeenCalledWith({ where: { userId: 'user-A' } });
    expect(prefFindManyMock).toHaveBeenCalledWith({ where: { userId: 'user-A' } });
  });

  it('excludes password hashes, secrets, roles, and other-user identifiers from the payload', async () => {
    const res = await exportHandler(authEvent('/api/consent/export', { httpMethod: 'GET' }));

    const body = JSON.parse(res.body);
    const serialized = JSON.stringify(body);
    expect(serialized).not.toContain('password');
    expect(serialized).not.toContain('passwordHash');
    expect(serialized).not.toContain('stripeCustomerId');
    expect(serialized).not.toContain('superadmin');
    expect(serialized).not.toContain('userId');
    expect(serialized).not.toContain('secret');
  });

  it('returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' } as any);

    const res = await exportHandler(authEvent('/api/consent/export', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(401);
    expect(recordFindManyMock).not.toHaveBeenCalled();
  });
});

describe('GET/POST /api/consent/preferences — category preferences upsert', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: {} } as any);
    userUpsertMock.mockResolvedValue(USER_A as any);
  });

  it('GET returns the saved preference for the subject', async () => {
    prefFindUniqueMock.mockResolvedValue(prefRow() as any);

    const res = await preferencesHandler(authEvent('/api/consent/preferences', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.preferences.policyVersion).toBe('1');
    expect(body.preferences.categories).toEqual({ analytics: true, marketing: false });
    expect(prefFindUniqueMock).toHaveBeenCalledWith({ where: { userId: 'user-A' } });
  });

  it('GET returns preferences:null when nothing is saved yet', async () => {
    prefFindUniqueMock.mockResolvedValue(null);

    const res = await preferencesHandler(authEvent('/api/consent/preferences', { httpMethod: 'GET' }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).preferences).toBeNull();
  });

  it('POST upserts current-state preferences keyed to the subject', async () => {
    prefUpsertMock.mockResolvedValue(prefRow() as any);

    const res = await preferencesHandler(
      authEvent('/api/consent/preferences', {
        body: JSON.stringify({ policyVersion: '1', categories: { analytics: true, marketing: false } }),
      })
    );

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).preferences.policyVersion).toBe('1');
    expect(prefUpsertMock).toHaveBeenCalledWith({
      where: { userId: 'user-A' },
      update: { policyVersion: '1', categories: { analytics: true, marketing: false }, locale: 'pt-BR' },
      create: { userId: 'user-A', policyVersion: '1', categories: { analytics: true, marketing: false }, locale: 'pt-BR' },
    });
  });

  it('POST rejects non-boolean category values with 422 INVALID_PAYLOAD', async () => {
    const res = await preferencesHandler(
      authEvent('/api/consent/preferences', {
        body: JSON.stringify({ policyVersion: '1', categories: { analytics: 'yes' } }),
      })
    );

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).code).toBe('INVALID_PAYLOAD');
    expect(prefUpsertMock).not.toHaveBeenCalled();
  });

  it('POST rejects unknown category keys with 422 INVALID_PAYLOAD', async () => {
    const res = await preferencesHandler(
      authEvent('/api/consent/preferences', {
        body: JSON.stringify({ policyVersion: '1', categories: { analytics: true, foo: false } }),
      })
    );

    expect(res.statusCode).toBe(422);
    expect(JSON.parse(res.body).code).toBe('INVALID_PAYLOAD');
    expect(prefUpsertMock).not.toHaveBeenCalled();
  });

  it('POST returns 401 when unauthenticated', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' } as any);

    const res = await preferencesHandler(
      authEvent('/api/consent/preferences', {
        body: JSON.stringify({ policyVersion: '1', categories: { analytics: true } }),
      })
    );

    expect(res.statusCode).toBe(401);
    expect(prefUpsertMock).not.toHaveBeenCalled();
  });
});
