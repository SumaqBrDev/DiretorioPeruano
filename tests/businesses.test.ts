// tests/businesses.test.ts
// Strict TDD for tasks 2.2 (KYC wiring) and 2.3 (minRating filter).
// Handler wiring is tested with minimal mocks (lib/prisma, lib/cnpj).
// No DATABASE_URL needed.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { create: vi.fn(), findMany: vi.fn() },
    user: { findUnique: vi.fn() },
    // WU2c: POST now runs the re-consent gate (assertCurrentMandatoryConsent),
    // which reads consentRecord.findMany for non-admin owners.
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
import { validateCnpj } from '../netlify/functions/lib/cnpj';
import { authenticateRequest } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const userFindMock = vi.mocked(prisma.user.findUnique);
const validateCnpjMock = vi.mocked(validateCnpj);
const createMock = vi.mocked(prisma.businessProfile.create);
const findManyMock = vi.mocked(prisma.businessProfile.findMany);
const recordFindManyMock = vi.mocked(prisma.consentRecord.findMany);

// Current mandatory (purpose=service) consent for the mocked owner so the
// WU2c re-consent gate passes (active versions: privacy_policy v2,
// terms_of_service v1 — src/config/legal.ts).
const CURRENT_SERVICE_ROWS = [
  { id: 'c-privacy', documentType: 'privacy_policy', documentVersion: '2', purpose: 'service', granted: true, createdAt: new Date('2026-08-17T10:00:00Z') },
  { id: 'c-terms', documentType: 'terms_of_service', documentVersion: '1', purpose: 'service', granted: true, createdAt: new Date('2026-08-17T10:00:00Z') },
];

describe('POST /api/businesses — KYC wiring', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: { clerkId: 'user_clerk_1' } } as any);
    userFindMock.mockResolvedValue({ id: 'user-db-id', role: 'business' } as any);
    recordFindManyMock.mockResolvedValue(CURRENT_SERVICE_ROWS as any);
    createMock.mockImplementation((args) =>
      Promise.resolve({ id: 'b1', createdAt: new Date(), ...args.data }) as any
    );
  });

  it('persists normalized cnpj and KYC fields when cnpj is valid', async () => {
    validateCnpjMock.mockResolvedValue({ valid: true, formatValid: true } as any);
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        name: 'Chifa',
        description: 'Comida chinesa',
        ownerId: 'u1',
        cnpj: '11.222.333/0001-81',
        ownerFullName: 'João Silva',
        ownerBirthCity: 'Lima',
      }),
    });

    expect(res.statusCode).toBe(201);
    expect(validateCnpjMock).toHaveBeenCalledWith('11.222.333/0001-81');
    const data = createMock.mock.calls[0][0].data;
    expect(data.cnpj).toBe('11222333000181');
    expect(data.ownerFullName).toBe('João Silva');
    expect(data.ownerBirthCity).toBe('Lima');
  });

  it('rejects with 400 and does not persist when cnpj is invalid', async () => {
    validateCnpjMock.mockResolvedValue({ valid: false, formatValid: false, note: 'invalid' });
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        name: 'Chifa',
        description: 'Comida chinesa',
        ownerId: 'u1',
        cnpj: '11.222.333/0001-82',
        ownerFullName: 'João Silva',
        ownerBirthCity: 'Lima',
      }),
    });

    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: 'CNPJ inválido' });
    expect(createMock).not.toHaveBeenCalled();
  });

  it('creates the business when cnpj is absent, leaving KYC fields null', async () => {
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ name: 'Chifa', description: 'Comida chinesa', ownerId: 'u1' }),
    });

    expect(res.statusCode).toBe(201);
    expect(validateCnpjMock).not.toHaveBeenCalled();
    const data = createMock.mock.calls[0][0].data;
    expect(data.cnpj).toBeNull();
    expect(data.ownerFullName).toBeNull();
    expect(data.ownerBirthCity).toBeNull();
  });

  it('stamps dataClassification from the authenticated owner', async () => {
    userFindMock.mockResolvedValue({ id: 'user-db-id', role: 'business', dataClassification: 'test' } as any);

    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ name: 'Chifa', description: 'Comida chinesa', ownerId: 'client-supplied-owner' }),
    });

    expect(res.statusCode).toBe(201);
    expect(createMock.mock.calls[0][0].data.ownerId).toBe('user-db-id');
    expect(createMock.mock.calls[0][0].data.dataClassification).toBe('test');
  });

  it('ignores any client-supplied dataClassification override', async () => {
    userFindMock.mockResolvedValue({ id: 'user-db-id', role: 'business', dataClassification: 'real' } as any);

    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({
        name: 'Chifa',
        description: 'Comida chinesa',
        ownerId: 'client-supplied-owner',
        dataClassification: 'test',
      }),
    });

    expect(res.statusCode).toBe(201);
    expect(createMock.mock.calls[0][0].data.dataClassification).toBe('real');
    expect(createMock.mock.calls[0][0].data).not.toHaveProperty('ownerId', 'client-supplied-owner');
  });
});

describe('GET /api/businesses — minRating filter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes rating gte filter and returns real rating when minRating is given', async () => {
    findManyMock.mockResolvedValue([
      { id: 'b1', name: 'A', rating: 4.5, address: {}, tags: [], photos: [], _count: { reviews: 2 } },
    ] as any);

    const res = await handler({
      httpMethod: 'GET',
      queryStringParameters: { minRating: '4' },
    });

    expect(res.statusCode).toBe(200);
    const where = (findManyMock.mock.calls[0]?.[0] as { where?: any })?.where;
    expect(where?.rating).toEqual({ gte: 4 });
    const body = JSON.parse(res.body);
    expect(body[0].rating).toBe(4.5);
  });

  it('does not add a rating filter when minRating is absent', async () => {
    findManyMock.mockResolvedValue([] as any);
    await handler({ httpMethod: 'GET', queryStringParameters: {} });
    const where = (findManyMock.mock.calls[0]?.[0] as { where?: any })?.where;
    expect(where?.rating).toBeUndefined();
  });

  it('ignores non-numeric minRating', async () => {
    findManyMock.mockResolvedValue([] as any);
    await handler({ httpMethod: 'GET', queryStringParameters: { minRating: 'abc' } });
    const where = (findManyMock.mock.calls[0]?.[0] as { where?: any })?.where;
    expect(where?.rating).toBeUndefined();
  });
});
