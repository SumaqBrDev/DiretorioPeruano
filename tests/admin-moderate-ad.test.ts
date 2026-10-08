// tests/admin-moderate-ad.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

const { stripeMocks, authMocks } = vi.hoisted(() => ({
  stripeMocks: { refundsCreate: vi.fn(), sessionsRetrieve: vi.fn() },
  authMocks: { requireSuperAdmin: vi.fn() },
}));

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    businessAd: { findUnique: vi.fn(), update: vi.fn() },
  },
}));
vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: () => ({
    refunds: { create: stripeMocks.refundsCreate },
    checkout: { sessions: { retrieve: stripeMocks.sessionsRetrieve } },
  }),
}));
vi.mock('../netlify/functions/lib/auth', () => ({
  requireSuperAdmin: authMocks.requireSuperAdmin,
}));

import { handler } from '../netlify/functions/admin-moderate-ad';
import prisma from '../netlify/functions/lib/prisma';

const adFind = vi.mocked(prisma.businessAd.findUnique);
const adUpdate = vi.mocked(prisma.businessAd.update);

function post(body: unknown): HandlerEvent {
  return { httpMethod: 'POST', body: JSON.stringify(body), headers: {} } as unknown as HandlerEvent;
}

describe('admin-moderate-ad', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    authMocks.requireSuperAdmin.mockResolvedValue({ ok: true, clerkId: 'admin-1' });
    stripeMocks.sessionsRetrieve.mockResolvedValue({ payment_intent: 'pi_123' });
    stripeMocks.refundsCreate.mockResolvedValue({ id: 're_1' });
  });

  it('refuses a caller who is not a super admin', async () => {
    authMocks.requireSuperAdmin.mockResolvedValue({
      ok: false,
      statusCode: 403,
      error: 'Acesso negado',
    });

    const res = await handler(post({ adId: 'ad-1', action: 'approve' }));

    expect(res.statusCode).toBe(403);
    expect(adUpdate).not.toHaveBeenCalled();
  });

  it('publishes an approved ad and starts its paid window', async () => {
    adFind.mockResolvedValue({
      id: 'ad-1',
      status: 'pending_review',
      reviewAttempts: 0,
      stripePaymentId: 'cs_1',
    } as never);

    const res = await handler(post({ adId: 'ad-1', action: 'approve' }));
    const arg = adUpdate.mock.calls[0][0] as { data: Record<string, unknown> };

    expect(res.statusCode).toBe(200);
    expect(arg.data.status).toBe('active');
    // The 30 days must start on publication, not on payment: the advertiser
    // should not lose paid days while waiting for review.
    expect(arg.data.startsAt).toBeInstanceOf(Date);
    expect(arg.data.endsAt).toBeInstanceOf(Date);
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();
  });

  it('requires a reason when rejecting — a block with no motive reads as a bug', async () => {
    adFind.mockResolvedValue({
      id: 'ad-1',
      status: 'pending_review',
      reviewAttempts: 0,
      stripePaymentId: 'cs_1',
    } as never);

    const res = await handler(post({ adId: 'ad-1', action: 'reject' }));

    expect(res.statusCode).toBe(400);
    expect(adUpdate).not.toHaveBeenCalled();
  });

  it('leaves a first rejection correctable and records the reason', async () => {
    adFind.mockResolvedValue({
      id: 'ad-1',
      status: 'pending_review',
      reviewAttempts: 0,
      stripePaymentId: 'cs_1',
    } as never);

    const res = await handler(
      post({ adId: 'ad-1', action: 'reject', reason: 'Fora da temática do site.' })
    );
    const body = JSON.parse(res.body);
    const arg = adUpdate.mock.calls[0][0] as { data: Record<string, unknown> };

    expect(res.statusCode).toBe(200);
    expect(arg.data.status).toBe('inactive_for_review');
    expect(arg.data.moderationReason).toBe('Fora da temática do site.');
    expect(arg.data.reviewAttempts).toBe(1);
    expect(body.attemptsRemaining).toBe(2);
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();
  });

  // Third strike: the ad never reached the public, so the money goes back.
  // Retaining it would be void under CDC art. 51, II.
  it('refunds on the third rejection and terminates the ad', async () => {
    adFind.mockResolvedValue({
      id: 'ad-1',
      status: 'inactive_for_review',
      reviewAttempts: 2,
      stripePaymentId: 'cs_1',
    } as never);

    const res = await handler(
      post({ adId: 'ad-1', action: 'reject', reason: 'Conteúdo proibido.' })
    );
    const body = JSON.parse(res.body);
    const arg = adUpdate.mock.calls[0][0] as { data: Record<string, unknown> };

    expect(res.statusCode).toBe(200);
    expect(arg.data.status).toBe('rejected_final');
    expect(stripeMocks.refundsCreate).toHaveBeenCalledWith(
      expect.objectContaining({ payment_intent: 'pi_123' })
    );
    expect(arg.data.refundedAt).toBeInstanceOf(Date);
    expect(body.refunded).toBe(true);
  });

  it('still terminates the ad when the refund call fails, and reports it', async () => {
    adFind.mockResolvedValue({
      id: 'ad-1',
      status: 'inactive_for_review',
      reviewAttempts: 2,
      stripePaymentId: 'cs_1',
    } as never);
    stripeMocks.refundsCreate.mockRejectedValue(new Error('charge already refunded'));

    const res = await handler(post({ adId: 'ad-1', action: 'reject', reason: 'Reincidência.' }));
    const body = JSON.parse(res.body);
    const arg = adUpdate.mock.calls[0][0] as { data: Record<string, unknown> };

    expect(res.statusCode).toBe(200);
    expect(arg.data.status).toBe('rejected_final');
    // Never claim a refund happened when it did not, and never stamp
    // refundedAt for a refund that failed.
    expect(body.refunded).toBe(false);
    expect(body.refundError).toBeTruthy();
    expect(arg.data.refundedAt).toBeUndefined();
  });

  // Beta ads are never charged, so there is nothing to give back.
  it('does not attempt a refund for an ad that was never paid', async () => {
    adFind.mockResolvedValue({
      id: 'ad-beta',
      status: 'inactive_for_review',
      reviewAttempts: 2,
      stripePaymentId: null,
    } as never);

    const res = await handler(post({ adId: 'ad-beta', action: 'reject', reason: 'Proibido.' }));

    expect(res.statusCode).toBe(200);
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();
    expect(JSON.parse(res.body).refunded).toBe(false);
  });

  // A published ad found in breach is the ONE no-refund case: the exhibition
  // service was actually delivered.
  it('disables a published ad in breach without refunding', async () => {
    adFind.mockResolvedValue({
      id: 'ad-live',
      status: 'active',
      reviewAttempts: 0,
      stripePaymentId: 'cs_1',
    } as never);

    const res = await handler(
      post({ adId: 'ad-live', action: 'reject', reason: 'Violação após publicação.' })
    );
    const arg = adUpdate.mock.calls[0][0] as { data: Record<string, unknown> };

    expect(arg.data.status).toBe('disabled_breach');
    expect(stripeMocks.refundsCreate).not.toHaveBeenCalled();
    expect(JSON.parse(res.body).refunded).toBe(false);
  });

  it('refuses to moderate an ad that is already terminal', async () => {
    adFind.mockResolvedValue({
      id: 'ad-done',
      status: 'rejected_final',
      reviewAttempts: 3,
      stripePaymentId: 'cs_1',
    } as never);

    const res = await handler(post({ adId: 'ad-done', action: 'reject', reason: 'x' }));

    expect(res.statusCode).toBe(409);
    expect(adUpdate).not.toHaveBeenCalled();
  });

  it('404s an unknown ad', async () => {
    adFind.mockResolvedValue(null as never);

    const res = await handler(post({ adId: 'nope', action: 'approve' }));

    expect(res.statusCode).toBe(404);
  });
});
