// tests/clerk-webhook-handler.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'node:crypto';
import type { HandlerEvent } from '@netlify/functions';

const SECRET = 'whsec_' + Buffer.from('test-secret-material').toString('base64');
process.env.CLERK_WEBHOOK_SECRET = SECRET;

const { stripeMocks } = vi.hoisted(() => ({
  stripeMocks: { subscriptionsCancel: vi.fn() },
}));

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn(), delete: vi.fn(), update: vi.fn() },
    businessProfile: { updateMany: vi.fn() },
    businessAd: { updateMany: vi.fn() },
  },
}));
vi.mock('../netlify/functions/lib/stripe', () => ({
  getStripe: () => ({ subscriptions: { cancel: stripeMocks.subscriptionsCancel } }),
}));

import { handler } from '../netlify/functions/clerk-webhook';
import prisma from '../netlify/functions/lib/prisma';

const userFind = vi.mocked(prisma.user.findUnique);
const userDelete = vi.mocked(prisma.user.delete);
const userUpdate = vi.mocked(prisma.user.update);
const bizUpdate = vi.mocked(prisma.businessProfile.updateMany);
const adUpdateMany = vi.mocked(prisma.businessAd.updateMany);

function signedEvent(payload: unknown, opts: { secret?: string } = {}): HandlerEvent {
  const body = JSON.stringify(payload);
  const id = 'msg_test';
  const ts = String(Math.floor(Date.now() / 1000));
  const key = Buffer.from((opts.secret ?? SECRET).replace(/^whsec_/, ''), 'base64');
  const mac = crypto.createHmac('sha256', key).update(`${id}.${ts}.${body}`).digest('base64');
  return {
    httpMethod: 'POST',
    body,
    headers: { 'svix-id': id, 'svix-timestamp': ts, 'svix-signature': `v1,${mac}` },
  } as unknown as HandlerEvent;
}

describe('clerk-webhook user.deleted', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('rejects an unsigned request — deletion must never be callable anonymously', async () => {
    const res = await handler({
      httpMethod: 'POST',
      body: JSON.stringify({ type: 'user.deleted', data: { id: 'u1' } }),
      headers: {},
    } as unknown as HandlerEvent);

    expect(res.statusCode).toBe(401);
    expect(userDelete).not.toHaveBeenCalled();
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it('rejects a payload signed with the wrong secret', async () => {
    const wrong = 'whsec_' + Buffer.from('attacker-secret').toString('base64');
    const res = await handler(
      signedEvent({ type: 'user.deleted', data: { id: 'u1' } }, { secret: wrong })
    );

    expect(res.statusCode).toBe(401);
    expect(userDelete).not.toHaveBeenCalled();
  });

  it('hard-deletes a user with no business', async () => {
    userFind.mockResolvedValue({ id: 'db-1', businesses: [] } as never);

    const res = await handler(signedEvent({ type: 'user.deleted', data: { id: 'clerk-1' } }));

    expect(res.statusCode).toBe(200);
    expect(userDelete).toHaveBeenCalledWith({ where: { id: 'db-1' } });
    expect(bizUpdate).not.toHaveBeenCalled();
  });

  it('unpublishes the business, cancels its ads and anonymises the owner', async () => {
    userFind.mockResolvedValue({
      id: 'db-2',
      businesses: [{ id: 'biz-2', subscriptionId: 'sub_9' }],
    } as never);

    const res = await handler(signedEvent({ type: 'user.deleted', data: { id: 'clerk-2' } }));
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.result).toBe('anonymize_user');

    // listing taken down
    expect(bizUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { ownerId: 'db-2' },
        data: expect.objectContaining({ status: 'disabled' }),
      })
    );
    // ads cancelled with the schema's spelling
    expect(adUpdateMany).toHaveBeenCalledWith(
      expect.objectContaining({ data: { status: 'cancelled' } })
    );
    // billing stopped
    expect(stripeMocks.subscriptionsCancel).toHaveBeenCalledWith('sub_9');
    // every personal identifier stripped
    const updateArg = userUpdate.mock.calls[0][0] as { data: Record<string, unknown> };
    expect(updateArg.data.email).toBeNull();
    expect(updateArg.data.name).toBeNull();
    expect(updateArg.data.clerkId).toBeNull();
    // the owning row survives so the unpublished listing keeps a valid ref
    expect(userDelete).not.toHaveBeenCalled();
  });

  it('still cleans up local data when Stripe cancellation fails', async () => {
    userFind.mockResolvedValue({
      id: 'db-3',
      businesses: [{ id: 'biz-3', subscriptionId: 'sub_dead' }],
    } as never);
    stripeMocks.subscriptionsCancel.mockRejectedValue(new Error('no such subscription'));

    const res = await handler(signedEvent({ type: 'user.deleted', data: { id: 'clerk-3' } }));

    expect(res.statusCode).toBe(200);
    expect(bizUpdate).toHaveBeenCalled();
    expect(userUpdate).toHaveBeenCalled();
  });

  it('acknowledges an unknown event type instead of erroring into a retry loop', async () => {
    const res = await handler(signedEvent({ type: 'user.created', data: { id: 'x' } }));

    expect(res.statusCode).toBe(200);
    expect(userDelete).not.toHaveBeenCalled();
  });

  it('acknowledges when the user never existed locally', async () => {
    userFind.mockResolvedValue(null as never);

    const res = await handler(signedEvent({ type: 'user.deleted', data: { id: 'ghost' } }));

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body).result).toBe('no_local_user');
  });
});
