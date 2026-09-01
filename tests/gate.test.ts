// tests/gate.test.ts
// Strict TDD (WU2c task 2.6): RED-first handler tests for the businesses
// re-consent gate (netlify/functions/businesses.ts POST).
//
// Acceptance criteria (spec #229 consent-api/Re-consent gate; design D3):
//   - Gate blocks stale consent → 409 { error, code: 'CONSENT_REQUIRED' }
//   - Gate blocks missing consent (fail-closed)
//   - Current mandatory consent proceeds → 201
//   - admin/superadmin exempt → 201
//   - Existing owner/role behavior preserved (401 missing user / 403 consumer)
//
// Handler wiring uses the repo convention (tests/businesses.test.ts pattern):
// vi.mock of lib/prisma + lib/auth + lib/cnpj; the core lib gate receives the
// mocked prisma via injected deps. Error envelope (design D6): { error, code? }.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { create: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    consentRecord: { findMany: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/cnpj', () => ({
  validateCnpj: vi.fn(),
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

import { handler } from '../netlify/functions/businesses';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const userFindMock = vi.mocked(prisma.user.findUnique);
const recordFindManyMock = vi.mocked(prisma.consentRecord.findMany);
const createMock = vi.mocked(prisma.businessProfile.create);

// Active mandatory (purpose=service) versions today: privacy_policy v3,
// terms_of_service v2 (registry src/config/legal.ts).
const CURRENT_SERVICE_ROWS = [
  {
    id: 'c-privacy',
    userId: 'user-db-id',
    documentType: 'privacy_policy',
    documentVersion: '3',
    purpose: 'service',
    granted: true,
    consentedAt: new Date('2026-09-01T10:00:00Z'),
    createdAt: new Date('2026-09-01T10:00:00Z'),
  },
  {
    id: 'c-terms',
    userId: 'user-db-id',
    documentType: 'terms_of_service',
    documentVersion: '2',
    purpose: 'service',
    granted: true,
    consentedAt: new Date('2026-09-01T10:00:00Z'),
    createdAt: new Date('2026-09-01T10:00:00Z'),
  },
];

function validBody() {
  return JSON.stringify({ name: 'Chifa', description: 'Comida chinesa', ownerId: 'u1' });
}

describe('POST /api/businesses — LGPD re-consent gate (WU2c)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: { clerkId: 'user_clerk_1' } } as any);
    userFindMock.mockResolvedValue({ id: 'user-db-id', role: 'business' } as any);
    recordFindManyMock.mockResolvedValue(CURRENT_SERVICE_ROWS as any);
    createMock.mockImplementation((args) =>
      Promise.resolve({ id: 'b1', createdAt: new Date(), ...args.data }) as any
    );
  });

  it('blocks creation with 409 CONSENT_REQUIRED when mandatory consent is missing', async () => {
    recordFindManyMock.mockResolvedValue([] as any);

    const res = await handler({ httpMethod: 'POST', body: validBody() });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('CONSENT_REQUIRED');
    expect(body.error).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
  });

  it('blocks creation with 409 CONSENT_REQUIRED when mandatory consent is stale (superseded version)', async () => {
    // privacy_policy v1 is superseded: the ACTIVE version is v3 → stale.
    recordFindManyMock.mockResolvedValue([
      { ...CURRENT_SERVICE_ROWS[0], documentVersion: '1', id: 'c-privacy-v1' },
      CURRENT_SERVICE_ROWS[1],
    ] as any);

    const res = await handler({ httpMethod: 'POST', body: validBody() });

    expect(res.statusCode).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.code).toBe('CONSENT_REQUIRED');
    expect(body.error).toBeTruthy();
    expect(createMock).not.toHaveBeenCalled();
    // The gate consults the owner's consent evidence before any mutation.
    expect(recordFindManyMock).toHaveBeenCalledWith({ where: { userId: 'user-db-id' } });
  });

  it('proceeds with 201 when mandatory consent is current', async () => {
    const res = await handler({ httpMethod: 'POST', body: validBody() });

    expect(res.statusCode).toBe(201);
    expect(createMock).toHaveBeenCalledTimes(1);
    const data = createMock.mock.calls[0][0].data;
    expect(data.ownerId).toBe('user-db-id');
  });

  it('exempts admin from the gate', async () => {
    userFindMock.mockResolvedValue({ id: 'user-db-id', role: 'admin' } as any);
    recordFindManyMock.mockResolvedValue([] as any);

    const res = await handler({ httpMethod: 'POST', body: validBody() });

    expect(res.statusCode).toBe(201);
    // Admin short-circuits: consent evidence is never consulted.
    expect(recordFindManyMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('exempts superadmin from the gate', async () => {
    userFindMock.mockResolvedValue({ id: 'user-db-id', role: 'superadmin' } as any);
    recordFindManyMock.mockResolvedValue([] as any);

    const res = await handler({ httpMethod: 'POST', body: validBody() });

    expect(res.statusCode).toBe(201);
    expect(recordFindManyMock).not.toHaveBeenCalled();
    expect(createMock).toHaveBeenCalledTimes(1);
  });

  it('fails closed when the local user row is missing (401, creation blocked)', async () => {
    userFindMock.mockResolvedValue(null as any);

    const res = await handler({ httpMethod: 'POST', body: validBody() });

    expect(res.statusCode).toBe(401);
    expect(JSON.parse(res.body).error).toBe('Usuário não encontrado');
    expect(createMock).not.toHaveBeenCalled();
    // Gate never runs — owner resolution comes first.
    expect(recordFindManyMock).not.toHaveBeenCalled();
  });

  it('preserves the consumer role block after the gate passes', async () => {
    userFindMock.mockResolvedValue({ id: 'user-db-id', role: 'consumer' } as any);

    const res = await handler({ httpMethod: 'POST', body: validBody() });

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toBe('Apenas contas empresariais podem cadastrar negócios');
    expect(createMock).not.toHaveBeenCalled();
  });

  it('returns 401 when unauthenticated (existing auth behavior preserved)', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado — token requerido' } as any);

    const res = await handler({ httpMethod: 'POST', body: validBody() });

    expect(res.statusCode).toBe(401);
    expect(createMock).not.toHaveBeenCalled();
  });
});
