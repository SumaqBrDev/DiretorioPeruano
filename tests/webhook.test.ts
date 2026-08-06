// tests/webhook.test.ts
// Task 2.4 — Webhook idempotency + disabledAt + subscriptionId.
// Pure logic tests: mock prisma to avoid DATABASE_URL.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    webhookEvent: { findUnique: vi.fn(), create: vi.fn() },
    businessProfile: { findFirst: vi.fn(), update: vi.fn(), findUnique: vi.fn() },
  },
}));

import { checkIdempotency, markEventProcessed } from '../netlify/functions/lib/webhook-events';
import prisma from '../netlify/functions/lib/prisma';

const webhookFindMock = vi.mocked(prisma.webhookEvent.findUnique);
const webhookCreateMock = vi.mocked(prisma.webhookEvent.create);

describe('checkIdempotency (pure logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when the event has NOT been processed (no DB record)', async () => {
    webhookFindMock.mockResolvedValue(null);
    const result = await checkIdempotency('evt_123');
    expect(result).toBeNull();
    expect(webhookFindMock).toHaveBeenCalledWith({
      where: { stripeEventId: 'evt_123' },
    });
  });

  it('returns the existing WebhookEvent when the event HAS been processed', async () => {
    const existing = { id: 'wh_1', stripeEventId: 'evt_123', type: 'customer.subscription.deleted', processedAt: new Date() };
    webhookFindMock.mockResolvedValue(existing as any);
    const result = await checkIdempotency('evt_123');
    expect(result).not.toBeNull();
    expect(result?.stripeEventId).toBe('evt_123');
  });
});

describe('markEventProcessed (pure logic)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a WebhookEvent record with the given stripeEventId, type, and payload', async () => {
    const payload = { id: 'sub_1' };
    webhookCreateMock.mockResolvedValue({
      id: 'wh_new',
      stripeEventId: 'evt_456',
      type: 'customer.subscription.updated',
      payload,
      processedAt: new Date(),
    } as any);

    const result = await markEventProcessed('evt_456', 'customer.subscription.updated', payload);
    expect(result).not.toBeNull();
    expect(webhookCreateMock).toHaveBeenCalledWith({
      data: {
        stripeEventId: 'evt_456',
        type: 'customer.subscription.updated',
        payload,
        processedAt: expect.any(Date),
      },
    });
  });
});