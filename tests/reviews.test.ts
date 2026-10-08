// tests/reviews.test.ts
// Strict TDD for task 2.1 — reviews.ts: Clerk auth + auto-approve.
// Pure logic lives in netlify/functions/lib/reviews.ts; handler wiring is
// tested with minimal mocks (lib/prisma, lib/auth). No DATABASE_URL needed.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
    review: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn() },
    businessProfile: { findUnique: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

import { validateReviewInput, buildReviewCreateData } from '../netlify/functions/lib/reviews';
import { handler } from '../netlify/functions/reviews';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const userFindMock = vi.mocked(prisma.user.findUnique);
const reviewCreateMock = vi.mocked(prisma.review.create);
const reviewFindMock = vi.mocked(prisma.review.findFirst);
const reviewFindManyMock = vi.mocked(prisma.review.findMany);
const businessFindMock = vi.mocked(prisma.businessProfile.findUnique);

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

describe('validateReviewInput (pure)', () => {
  it('accepts a complete valid review body', () => {
    expect(validateReviewInput({ rating: 4, comment: 'Ótimo', businessId: 'b1' })).toBeNull();
  });

  it('rejects when rating is missing or not a number', () => {
    expect(validateReviewInput({ comment: 'Ótimo', businessId: 'b1' })).toMatch(/1 e 5/);
    expect(validateReviewInput({ rating: '4', comment: 'Ótimo', businessId: 'b1' })).toMatch(/1 e 5/);
  });

  it('rejects when comment or businessId is missing', () => {
    expect(validateReviewInput({ rating: 4, businessId: 'b1' })).toMatch(/comment/);
    expect(validateReviewInput({ rating: 4, comment: 'Ótimo' })).toMatch(/businessId/);
  });

  it('rejects ratings out of the 1-5 range', () => {
    expect(validateReviewInput({ rating: 0, comment: 'x', businessId: 'b1' })).toMatch(/1 e 5/);
    expect(validateReviewInput({ rating: 6, comment: 'x', businessId: 'b1' })).toMatch(/1 e 5/);
  });
});

describe('buildReviewCreateData (pure)', () => {
  it('derives consumerId from the authenticated user, ignoring the client-supplied value', () => {
    const data = buildReviewCreateData(
      { rating: 5, comment: 'Excelente', businessId: 'b1', consumerId: 'client-fake' },
      'user-db-id'
    );
    expect(data).toEqual({
      rating: 5,
      comment: 'Excelente',
      status: 'approved',
      businessId: 'b1',
      consumerId: 'user-db-id',
    });
  });

  it('defaults status to approved even when body has no status', () => {
    const data = buildReviewCreateData({ rating: 3, comment: 'ok', businessId: 'b2' }, 'user-2');
    expect(data.status).toBe('approved');
    expect(data.consumerId).toBe('user-2');
  });
});

describe('reviews handler POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue({ ok: true, clerkId: 'user_clerk_1', claims: { clerkId: 'user_clerk_1' } });
    userFindMock.mockResolvedValue({ id: 'user-db-id' } as any);
    reviewFindMock.mockResolvedValue(null);
    businessFindMock.mockResolvedValue({ id: 'b1', ownerId: 'someone-else' } as any);
    reviewCreateMock.mockImplementation((args) => Promise.resolve({ id: 'r1', ...args.data }) as any);
  });

  it('creates a review with server-derived consumerId and APPROVED status (no status sent)', async () => {
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ rating: 5, comment: 'Ótimo serviço', businessId: 'b1', consumerId: 'client-fake' }),
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(201);
    expect(reviewCreateMock).toHaveBeenCalledTimes(1);
    const data = reviewCreateMock.mock.calls[0][0].data;
    expect(data.status).toBe('approved');
    expect(data.consumerId).toBe('user-db-id');
    expect(data.consumerId).not.toBe('client-fake');
    expect(JSON.parse(res.body)).toMatchObject({ id: 'r1', status: 'approved', consumerId: 'user-db-id' });
  });

  it('rejects an unauthenticated request with 401 and does not create a review', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' });
    const res = await handler({
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify({ rating: 5, comment: 'x', businessId: 'b1' }),
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(401);
    expect(reviewCreateMock).not.toHaveBeenCalled();
  });

  it('returns 400 on invalid body and does not create a review', async () => {
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ rating: 9, comment: '', businessId: 'b1' }),
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(400);
    expect(reviewCreateMock).not.toHaveBeenCalled();
  });

  it('returns 201 with the exact headers', async () => {
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ rating: 4, comment: 'bom', businessId: 'b1' }),
    } as unknown as HandlerEvent);
    expect(res.headers).toEqual(headers);
  });

  it('rejects a duplicate review with 409 and does not create a second one', async () => {
    reviewFindMock.mockResolvedValue({ id: 'existing-review' } as any);
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ rating: 5, comment: 'duplicado', businessId: 'b1' }),
    } as unknown as HandlerEvent);
    expect(res.statusCode).toBe(409);
    expect(reviewCreateMock).not.toHaveBeenCalled();
  });

  it('rejects a self-review: owner reviewing their own business, with 403', async () => {
    // Ownership-derived, not role-derived: works regardless of beta-mode role
    // promotion timing (see admin-approve.ts / stripe-webhook.ts).
    businessFindMock.mockResolvedValue({ id: 'b1', ownerId: 'user-db-id' } as any);
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ rating: 5, comment: 'review de mi propio negocio', businessId: 'b1' }),
    } as unknown as HandlerEvent);
    expect(res.statusCode).toBe(403);
    expect(reviewCreateMock).not.toHaveBeenCalled();
  });

  it('allows a business owner to review a DIFFERENT business they do not own', async () => {
    businessFindMock.mockResolvedValue({ id: 'b1', ownerId: 'someone-else' } as any);
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ rating: 5, comment: 'review de otro negocio', businessId: 'b1' }),
    } as unknown as HandlerEvent);
    expect(res.statusCode).toBe(201);
    expect(reviewCreateMock).toHaveBeenCalledTimes(1);
  });

  it('returns 404 when the reviewed business does not exist', async () => {
    businessFindMock.mockResolvedValue(null);
    const res = await handler({
      httpMethod: 'POST',
      headers: { authorization: 'Bearer token' },
      body: JSON.stringify({ rating: 5, comment: 'x', businessId: 'nonexistent' }),
    } as unknown as HandlerEvent);
    expect(res.statusCode).toBe(404);
    expect(reviewCreateMock).not.toHaveBeenCalled();
  });
});

describe('reviews handler GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewFindManyMock.mockResolvedValue([] as any);
  });

  it('requests only approved reviews belonging to approved businesses', async () => {
    const res = await handler({
      httpMethod: 'GET',
      queryStringParameters: { businessId: 'business-pending' },
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual([]);
    expect(reviewFindManyMock).toHaveBeenCalledTimes(1);
    expect(reviewFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: 'business-pending',
          status: 'approved',
          business: { status: 'approved' },
        },
      })
    );
  });
});
