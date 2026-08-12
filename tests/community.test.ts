// tests/community.test.ts
// Community (foro) — validación de entrada y lógica de votos/permisos.
// Pure logic is tested directly; handler wiring with minimal mocks
// (lib/prisma, lib/auth). No DATABASE_URL needed.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
    communityTopic: { findUnique: vi.fn(), findMany: vi.fn(), count: vi.fn(), create: vi.fn(), update: vi.fn() },
    communityPost: { findUnique: vi.fn(), create: vi.fn() },
    communityVote: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), aggregate: vi.fn(), groupBy: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

import { handler } from '../netlify/functions/community';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const topicFindMock = vi.mocked(prisma.communityTopic.findUnique);
const topicCreateMock = vi.mocked(prisma.communityTopic.create);
const postCreateMock = vi.mocked(prisma.communityPost.create);
const voteFindMock = vi.mocked(prisma.communityVote.findUnique);
const voteCreateMock = vi.mocked(prisma.communityVote.create);
const voteUpdateMock = vi.mocked(prisma.communityVote.update);
const voteDeleteMock = vi.mocked(prisma.communityVote.delete);
const voteAggregateMock = vi.mocked(prisma.communityVote.aggregate);

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

function postEvent(body: unknown) {
  return {
    httpMethod: 'POST',
    body: JSON.stringify(body),
    headers: {},
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ ok: true, clerkId: 'user_test' } as any);
  (prisma.user.findUnique as any).mockResolvedValue({ id: 'user-internal-1', name: 'QA User' });
});

describe('community topic creation', () => {
  it('creates a topic with valid title + body', async () => {
    topicCreateMock.mockResolvedValue({ id: 'topic-1' } as any);
    const res = await handler(postEvent({ action: 'create-topic', title: 'Onde achar ceviche?', body: 'Alguém conhece um bom restaurante?' }));
    expect(res.statusCode).toBe(201);
    expect(topicCreateMock).toHaveBeenCalledWith({
      data: { title: 'Onde achar ceviche?', body: 'Alguém conhece um bom restaurante?', authorId: 'user-internal-1' },
    });
  });

  it('rejects a title shorter than 5 characters', async () => {
    const res = await handler(postEvent({ action: 'create-topic', title: 'Oi', body: 'Corpo válido aqui' }));
    expect(res.statusCode).toBe(400);
    expect(topicCreateMock).not.toHaveBeenCalled();
  });

  it('rejects a body shorter than 10 characters', async () => {
    const res = await handler(postEvent({ action: 'create-topic', title: 'Título válido', body: 'curto' }));
    expect(res.statusCode).toBe(400);
  });

  it('rejects whitespace-only title', async () => {
    const res = await handler(postEvent({ action: 'create-topic', title: '     ', body: 'Corpo válido aqui' }));
    expect(res.statusCode).toBe(400);
  });
});

describe('community post creation (TikTok-style replies)', () => {
  it('creates a root comment', async () => {
    topicFindMock.mockResolvedValue({ id: 'topic-1', status: 'visible' } as any);
    postCreateMock.mockResolvedValue({ id: 'post-1' } as any);
    const res = await handler(postEvent({ action: 'create-post', topicId: 'topic-1', body: 'Ótima pergunta!' }));
    expect(res.statusCode).toBe(201);
    expect(postCreateMock).toHaveBeenCalledWith({
      data: { topicId: 'topic-1', parentId: null, authorId: 'user-internal-1', body: 'Ótima pergunta!' },
    });
  });

  it('creates a reply with parentId (single-level indent)', async () => {
    topicFindMock.mockResolvedValue({ id: 'topic-1', status: 'visible' } as any);
    (prisma.communityPost.findUnique as any).mockResolvedValue({ id: 'post-1', topicId: 'topic-1', status: 'visible' } as any);
    postCreateMock.mockResolvedValue({ id: 'post-2' } as any);
    const res = await handler(postEvent({ action: 'create-post', topicId: 'topic-1', parentId: 'post-1', body: 'Respondendo ao comentário' }));
    expect(res.statusCode).toBe(201);
    expect(postCreateMock).toHaveBeenCalledWith({
      data: { topicId: 'topic-1', parentId: 'post-1', authorId: 'user-internal-1', body: 'Respondendo ao comentário' },
    });
  });

  it('rejects a reply whose parent belongs to another topic', async () => {
    topicFindMock.mockResolvedValue({ id: 'topic-1', status: 'visible' } as any);
    (prisma.communityPost.findUnique as any).mockResolvedValue({ id: 'post-9', topicId: 'topic-OTHER', status: 'visible' } as any);
    const res = await handler(postEvent({ action: 'create-post', topicId: 'topic-1', parentId: 'post-9', body: 'Comentário' }));
    expect(res.statusCode).toBe(400);
    expect(postCreateMock).not.toHaveBeenCalled();
  });

  it('rejects whitespace-only body', async () => {
    const res = await handler(postEvent({ action: 'create-post', topicId: 'topic-1', body: '   ' }));
    expect(res.statusCode).toBe(400);
  });

  it('rejects when the topic is hidden/deleted', async () => {
    topicFindMock.mockResolvedValue({ id: 'topic-1', status: 'hidden' } as any);
    const res = await handler(postEvent({ action: 'create-post', topicId: 'topic-1', body: 'Comentário válido' }));
    expect(res.statusCode).toBe(404);
  });
});

describe('community votes (like/dislike toggle)', () => {
  it('creates a new like vote and returns the tally', async () => {
    topicFindMock.mockResolvedValue({ id: 'topic-1', status: 'visible' } as any);
    voteFindMock.mockResolvedValue(null);
    voteCreateMock.mockResolvedValue({ id: 'vote-1', value: 1 } as any);
    voteAggregateMock.mockResolvedValue({ _sum: { value: 3 } } as any);
    const res = await handler(postEvent({ action: 'vote', targetType: 'topic', targetId: 'topic-1', value: 1 }));
    expect(res.statusCode).toBe(200);
    expect(voteCreateMock).toHaveBeenCalledWith({
      data: { targetType: 'topic', targetId: 'topic-1', userId: 'user-internal-1', value: 1 },
    });
    expect(JSON.parse(res.body).score).toBe(3);
  });

  it('removes the vote when the same value is toggled again', async () => {
    topicFindMock.mockResolvedValue({ id: 'topic-1', status: 'visible' } as any);
    voteFindMock.mockResolvedValue({ id: 'vote-1', value: 1 } as any);
    voteDeleteMock.mockResolvedValue({} as any);
    voteAggregateMock.mockResolvedValue({ _sum: { value: 2 } } as any);
    const res = await handler(postEvent({ action: 'vote', targetType: 'topic', targetId: 'topic-1', value: 1 }));
    expect(res.statusCode).toBe(200);
    expect(voteDeleteMock).toHaveBeenCalledWith({ where: { id: 'vote-1' } });
    expect(JSON.parse(res.body).vote.removed).toBe(true);
  });

  it('flips the vote when the opposite value is chosen', async () => {
    topicFindMock.mockResolvedValue({ id: 'topic-1', status: 'visible' } as any);
    voteFindMock.mockResolvedValue({ id: 'vote-1', value: 1 } as any);
    voteUpdateMock.mockResolvedValue({ id: 'vote-1', value: -1 } as any);
    voteAggregateMock.mockResolvedValue({ _sum: { value: 1 } } as any);
    const res = await handler(postEvent({ action: 'vote', targetType: 'topic', targetId: 'topic-1', value: -1 }));
    expect(res.statusCode).toBe(200);
    expect(voteUpdateMock).toHaveBeenCalledWith({ where: { id: 'vote-1' }, data: { value: -1 } });
  });

  it('rejects an invalid targetType', async () => {
    const res = await handler(postEvent({ action: 'vote', targetType: 'bogus', targetId: 'x', value: 1 }));
    expect(res.statusCode).toBe(400);
  });

  it('rejects an invalid vote value', async () => {
    const res = await handler(postEvent({ action: 'vote', targetType: 'topic', targetId: 'topic-1', value: 5 }));
    expect(res.statusCode).toBe(400);
  });
});

describe('community auth guards', () => {
  it('returns 401 when not authenticated', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado — token requerido' } as any);
    const res = await handler(postEvent({ action: 'create-topic', title: 'Título válido', body: 'Corpo válido aqui' }));
    expect(res.statusCode).toBe(401);
  });

  it('returns 401 when the Clerk user has no DB row', async () => {
    (prisma.user.findUnique as any).mockResolvedValue(null);
    const res = await handler(postEvent({ action: 'create-topic', title: 'Título válido', body: 'Corpo válido aqui' }));
    expect(res.statusCode).toBe(401);
  });
});
