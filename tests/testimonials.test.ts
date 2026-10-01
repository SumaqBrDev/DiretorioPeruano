// tests/testimonials.test.ts
// Public testimonials must not expose review text for non-approved businesses.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    review: { findMany: vi.fn() },
  },
}));

import { handler } from '../netlify/functions/testimonials';
import prisma from '../netlify/functions/lib/prisma';

const reviewFindManyMock = vi.mocked(prisma.review.findMany);

describe('testimonials handler GET', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    reviewFindManyMock.mockResolvedValue([] as any);
  });

  it('requests only approved reviews belonging to approved businesses', async () => {
    const res = await handler({ httpMethod: 'GET' } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(200);
    expect(reviewFindManyMock).toHaveBeenCalledTimes(1);
    expect(reviewFindManyMock).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: 'approved',
          business: { status: 'approved' },
        },
      })
    );
  });
});
