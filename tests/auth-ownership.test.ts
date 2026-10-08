// tests/auth-ownership.test.ts
//
// Ownership isolation guard for multi-business accounts.
//
// Before multi-business support the rule was `user.business.id === businessId`:
// one owner, one business, compared AFTER fetching. Now an owner may hold
// several businesses, and `resolveOwnedBusiness` enforces ownership inside the
// QUERY (`where: { id, ownerId }`) so a business belonging to someone else can
// never be returned in the first place.
//
// These tests pin that property. The scoping is invisible in a normal passing
// run -- a regression that drops `ownerId` from the where clause still serves
// every legitimate owner correctly and only shows up as cross-owner data
// exposure, which no happy-path test would catch.
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { findFirst: vi.fn(), findMany: vi.fn() },
  },
}));

import { resolveOwnedBusiness, listOwnedBusinesses } from '../netlify/functions/lib/ownership';
import prisma from '../netlify/functions/lib/prisma';

const findFirstMock = vi.mocked(prisma.businessProfile.findFirst);
const findManyMock = vi.mocked(prisma.businessProfile.findMany);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('resolveOwnedBusiness — ownership scoping', () => {
  // THE CRITICAL PROPERTY. Every guarded surface (uploads, ad checkout,
  // business editing) routes through here, so if the query stops filtering by
  // ownerId, one user can act on another user's business.
  it('always constrains the query by ownerId', async () => {
    findFirstMock.mockResolvedValue({ id: 'biz-1', ownerId: 'user-1' } as never);

    await resolveOwnedBusiness('user-1', 'biz-1');

    const where = findFirstMock.mock.calls[0]![0]!.where as Record<string, unknown>;
    expect(where.ownerId).toBe('user-1');
    expect(where.id).toBe('biz-1');
  });

  it('scopes by ownerId even when no business id is supplied', async () => {
    findFirstMock.mockResolvedValue({ id: 'biz-1', ownerId: 'user-1' } as never);

    await resolveOwnedBusiness('user-1');

    const where = findFirstMock.mock.calls[0]![0]!.where as Record<string, unknown>;
    expect(where.ownerId).toBe('user-1');
    // No id filter: the caller asked for "any of mine", not a specific one.
    expect(where.id).toBeUndefined();
  });

  // A business owned by someone else produces no row, because the ownerId
  // filter excluded it -- not because of a post-fetch comparison.
  it('denies access to a business owned by another user', async () => {
    findFirstMock.mockResolvedValue(null as never);

    const result = await resolveOwnedBusiness('user-1', 'biz-belonging-to-user-2');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected denial');
    expect(result.statusCode).toBe(403);
  });

  // 403 vs 404 is a deliberate distinction: naming a business you do not own is
  // forbidden, while owning none at all is simply "nothing here". Collapsing
  // them would either leak existence or mislabel a missing account.
  it('returns 404 — not 403 — when the user owns no business at all', async () => {
    findFirstMock.mockResolvedValue(null as never);

    const result = await resolveOwnedBusiness('user-with-nothing');

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected denial');
    expect(result.statusCode).toBe(404);
  });

  it('returns the business when the user owns it', async () => {
    findFirstMock.mockResolvedValue({ id: 'biz-1', ownerId: 'user-1' } as never);

    const result = await resolveOwnedBusiness('user-1', 'biz-1');

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error('expected success');
    expect(result.business.id).toBe('biz-1');
  });

  // Multi-business is the whole point of the change: the same owner must be
  // able to resolve each of their businesses by id.
  it('resolves each of several businesses held by the same owner', async () => {
    findFirstMock.mockResolvedValueOnce({ id: 'biz-1', ownerId: 'user-1' } as never);
    findFirstMock.mockResolvedValueOnce({ id: 'biz-2', ownerId: 'user-1' } as never);

    const first = await resolveOwnedBusiness('user-1', 'biz-1');
    const second = await resolveOwnedBusiness('user-1', 'biz-2');

    expect(first.ok && first.business.id).toBe('biz-1');
    expect(second.ok && second.business.id).toBe('biz-2');
  });

  it('requests ads only when asked, keeping the default read lean', async () => {
    findFirstMock.mockResolvedValue({ id: 'biz-1', ownerId: 'user-1' } as never);

    await resolveOwnedBusiness('user-1', 'biz-1');
    expect(findFirstMock.mock.calls[0]![0]!.include).toBeUndefined();

    await resolveOwnedBusiness('user-1', 'biz-1', { includeAds: true });
    expect(findFirstMock.mock.calls[1]![0]!.include).toBeDefined();
  });
});

describe('listOwnedBusinesses — ownership scoping', () => {
  it('constrains the list by ownerId', async () => {
    findManyMock.mockResolvedValue([] as never);

    await listOwnedBusinesses('user-1');

    const where = findManyMock.mock.calls[0]![0]!.where as Record<string, unknown>;
    expect(where.ownerId).toBe('user-1');
  });

  it('returns an empty list rather than throwing when the user owns nothing', async () => {
    findManyMock.mockResolvedValue([] as never);

    await expect(listOwnedBusinesses('user-with-nothing')).resolves.toEqual([]);
  });
});
