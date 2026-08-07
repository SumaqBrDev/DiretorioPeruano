// tests/portal.test.ts
// Task 2.5 — Portal auth guard: requireBusinessOwner or requireSuperAdmin.
// Pure mock-based test — no DATABASE_URL needed.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessProfile: { findUnique: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  requireBusinessOwner: vi.fn(),
  requireSuperAdmin: vi.fn(),
}));

vi.mock('stripe', () => {
  const mockInstance = {
    billingPortal: {
      sessions: {
        create: vi.fn().mockResolvedValue({ url: 'https://portal.stripe.com/session_xyz' }),
      },
    },
  };
  const MockStripe: any = function () { return mockInstance; };
  MockStripe.prototype = {};
  return { default: MockStripe };
});

import { handler } from '../netlify/functions/stripe-portal';
import { requireBusinessOwner, requireSuperAdmin } from '../netlify/functions/lib/auth';
import prisma from '../netlify/functions/lib/prisma';

const ownerAuthMock = vi.mocked(requireBusinessOwner);
const adminAuthMock = vi.mocked(requireSuperAdmin);
const bizFindMock = vi.mocked(prisma.businessProfile.findUnique);

function makeEvent(overrides: any = {}) {
  return {
    httpMethod: 'POST',
    headers: { authorization: 'Bearer valid-token', origin: 'http://localhost' },
    body: JSON.stringify({ businessId: 'biz-1' }),
    ...overrides,
  };
}

const mockBusiness = {
  id: 'biz-1',
  stripeCustomerId: 'cus_123',
  name: 'Test Business',
};

describe('stripe-portal auth guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    bizFindMock.mockResolvedValue(mockBusiness as any);
  });

  it('allows the business owner to create a portal session', async () => {
    ownerAuthMock.mockResolvedValue({ ok: true, ownerBusinessId: 'biz-1', userId: 'user-1' });

    const res = await handler(makeEvent());

    expect(res.statusCode).toBe(200);
    expect(ownerAuthMock).toHaveBeenCalledWith(expect.any(Object), 'biz-1');
    expect(adminAuthMock).not.toHaveBeenCalled();
  });

  it('allows a superadmin to create a portal session when not the owner', async () => {
    ownerAuthMock.mockResolvedValue({ ok: false, statusCode: 403, error: 'No eres propietario' });
    adminAuthMock.mockResolvedValue({ ok: true, clerkId: 'admin-clerk' });

    const res = await handler(makeEvent());

    expect(res.statusCode).toBe(200);
    expect(ownerAuthMock).toHaveBeenCalled();
    expect(adminAuthMock).toHaveBeenCalled();
  });

  it('rejects a request from a non-owner, non-superadmin user with 403', async () => {
    ownerAuthMock.mockResolvedValue({ ok: false, statusCode: 403, error: 'No eres propietario' });
    adminAuthMock.mockResolvedValue({ ok: false, statusCode: 403, error: 'No eres superadmin' });

    const res = await handler(makeEvent());

    expect(res.statusCode).toBe(403);
    expect(JSON.parse(res.body).error).toContain('Acceso denegado');
  });

  it('returns 400 when businessId is missing', async () => {
    const res = await handler(makeEvent({ body: JSON.stringify({}) }));

    expect(res.statusCode).toBe(400);
    expect(ownerAuthMock).not.toHaveBeenCalled();
  });

  it('returns 405 when method is not POST', async () => {
    const res = await handler(makeEvent({ httpMethod: 'GET' }));

    expect(res.statusCode).toBe(405);
    expect(ownerAuthMock).not.toHaveBeenCalled();
  });
});