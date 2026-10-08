import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
    businessProfile: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));
vi.mock('../netlify/functions/lib/auth', () => ({ authenticateRequest: vi.fn() }));

import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';
import { resolveOwnedBusiness } from '../netlify/functions/lib/ownership';
import { handler as myBusinessesHandler } from '../netlify/functions/my-businesses';
import { handler as messagesHandler } from '../netlify/functions/messages';

const authMock = vi.mocked(authenticateRequest);
const userFindMock = vi.mocked(prisma.user.findUnique);
const businessFindFirstMock = vi.mocked(prisma.businessProfile.findFirst);
const businessFindManyMock = vi.mocked(prisma.businessProfile.findMany);

describe('multi-business ownership resolver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 403 for a cross-owner business id', async () => {
    businessFindFirstMock.mockResolvedValue(null as never);

    const result = await resolveOwnedBusiness('owner-a', 'business-b');

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.statusCode).toBe(403);
    expect(businessFindFirstMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'business-b', ownerId: 'owner-a' },
    }));
  });

  it('resolves the first owned business for backward-compatible singular endpoints', async () => {
    businessFindFirstMock.mockResolvedValue({ id: 'business-a', ownerId: 'owner-a' } as never);

    const result = await resolveOwnedBusiness('owner-a');

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.business.id).toBe('business-a');
    expect(businessFindFirstMock).toHaveBeenCalledWith(expect.objectContaining({
      where: { ownerId: 'owner-a' },
      orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    }));
  });
});

describe('GET /api/my-businesses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'clerk-1' } as never);
    userFindMock.mockResolvedValue({ id: 'owner-a' } as never);
  });

  it('lists every business owned by the authenticated user', async () => {
    businessFindManyMock.mockResolvedValue([
      { id: 'b1', name: 'One', status: 'approved', createdAt: new Date('2026-01-01') },
      { id: 'b2', name: 'Two', status: 'pending', createdAt: new Date('2026-02-01') },
    ] as never);

    const res = await myBusinessesHandler({ httpMethod: 'GET', headers: { authorization: 'Bearer t' } } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).businesses.map((b: { id: string }) => b.id)).toEqual(['b1', 'b2']);
    expect(businessFindManyMock).toHaveBeenCalledWith(expect.objectContaining({ where: { ownerId: 'owner-a' } }));
  });
});

describe('messages ownership', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'clerk-1' } as never);
    userFindMock.mockResolvedValue({ id: 'owner-a' } as never);
  });

  it('returns 403 when the requested business belongs to another owner', async () => {
    businessFindFirstMock.mockResolvedValue(null as never);

    const res = await messagesHandler({
      httpMethod: 'GET',
      headers: { authorization: 'Bearer t' },
      queryStringParameters: { businessId: 'not-mine' },
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(403);
  });
});
