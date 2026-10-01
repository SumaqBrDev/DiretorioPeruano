// tests/business-intent.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: { user: { findUnique: vi.fn(), update: vi.fn() } },
}));
vi.mock('../netlify/functions/lib/auth', () => ({ authenticateRequest: vi.fn() }));

import { handler } from '../netlify/functions/business-intent';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const findMock = vi.mocked(prisma.user.findUnique);
const updateMock = vi.mocked(prisma.user.update);

describe('business-intent', () => {
  beforeEach(() => vi.clearAllMocks());

  it('rejects unauthenticated requests', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' } as never);
    const res = await handler({ httpMethod: 'POST', headers: {} } as unknown as HandlerEvent);
    expect(res.statusCode).toBe(401);
    expect(updateMock).not.toHaveBeenCalled();
  });

  it('marks the intent for a consumer', async () => {
    authMock.mockResolvedValue({ ok: true, clerkId: 'c1', claims: {} } as never);
    findMock.mockResolvedValue({ id: 'u1', role: 'consumer', businessIntentAt: null } as never);
    updateMock.mockResolvedValue({ id: 'u1', role: 'consumer', businessIntentAt: new Date() } as never);

    const res = await handler({
      httpMethod: 'POST', headers: { authorization: 'Bearer t' },
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(200);
    expect(updateMock).toHaveBeenCalled();
  });

  it('is idempotent for a consumer that already has intent', async () => {
    const intentAt = new Date('2026-10-01T00:00:00Z');
    authMock.mockResolvedValue({ ok: true, clerkId: 'c-existing', claims: {} } as never);
    findMock.mockResolvedValue({ id: 'u-existing', role: 'consumer', businessIntentAt: intentAt } as never);

    const res = await handler({
      httpMethod: 'POST', headers: { authorization: 'Bearer t' },
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(200);
    expect(updateMock).not.toHaveBeenCalled();
    expect(JSON.parse(res.body).businessIntentAt).toBe(intentAt.toISOString());
  });

  it('is idempotent for a user already promoted to business', async () => {
    authMock.mockResolvedValue({ ok: true, clerkId: 'c2', claims: {} } as never);
    findMock.mockResolvedValue({ id: 'u2', role: 'business', businessIntentAt: null } as never);

    const res = await handler({
      httpMethod: 'POST', headers: { authorization: 'Bearer t' },
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(200);
    expect(updateMock).not.toHaveBeenCalled();
  });
});
