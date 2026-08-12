import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const TOPIC_TITLE_MIN = 5;
const TOPIC_BODY_MIN = 10;
const POST_BODY_MIN = 1;
const POST_BODY_MAX = 2000;
const TOPIC_BODY_MAX = 5000;

function validateTopicInput(body: any): string | null {
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const content = typeof body?.body === 'string' ? body.body.trim() : '';
  if (!title) return 'El título es obligatorio';
  if (title.length < TOPIC_TITLE_MIN) return `El título debe tener al menos ${TOPIC_TITLE_MIN} caracteres`;
  if (!content) return 'La descripción es obligatoria';
  if (content.length < TOPIC_BODY_MIN) return `La descripción debe tener al menos ${TOPIC_BODY_MIN} caracteres`;
  if (content.length > TOPIC_BODY_MAX) return `La descripción no puede superar ${TOPIC_BODY_MAX} caracteres`;
  return null;
}

function validatePostInput(body: any): string | null {
  const content = typeof body?.body === 'string' ? body.body.trim() : '';
  if (!content) return 'El mensaje es obligatorio';
  if (content.length < POST_BODY_MIN) return `El mensaje debe tener al menos ${POST_BODY_MIN} caracteres`;
  if (content.length > POST_BODY_MAX) return `El mensaje no puede superar ${POST_BODY_MAX} caracteres`;
  return null;
}

/** Resolve the internal user id for the verified Clerk id (401 when missing). */
async function resolveUser(auth: { ok: boolean; clerkId?: string }) {
  if (!auth.ok || !auth.clerkId) return null;
  return prisma.user.findUnique({
    where: { clerkId: auth.clerkId },
    select: { id: true, name: true },
  });
}

export const handler = async (event: any) => {
  // ── GET: list topics (public) or fetch one topic + its posts ──
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const { q, id, page, limit } = params;

    // Detail view: topic + posts (public read; hidden/deleted only for superadmin)
    if (id) {
      const topic = await prisma.communityTopic.findUnique({
        where: { id },
        include: {
          author: { select: { name: true } },
          posts: {
            where: { status: 'visible' },
            include: {
              author: { select: { name: true } },
              parent: { select: { author: { select: { name: true } } } },
            },
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!topic || topic.status !== 'visible') {
        return {
          statusCode: 404,
          headers,
          body: JSON.stringify({ error: 'Tema no encontrado' }),
        };
      }

      // Increment view count (fire-and-forget, non-blocking)
      prisma.communityTopic
        .update({ where: { id: topic.id }, data: { viewCount: { increment: 1 } } })
        .catch(() => undefined);

      // Vote tallies for topic + posts
      const topicScore = await prisma.communityVote.aggregate({
        where: { targetType: 'topic', targetId: topic.id },
        _sum: { value: true },
      });
      const postIds = topic.posts.map((p: any) => p.id);
      const postScores = postIds.length
        ? await prisma.communityVote.groupBy({
            by: ['targetId'],
            where: { targetType: 'post', targetId: { in: postIds } },
            _sum: { value: true },
          })
        : [];

      const scoreMap: Record<string, number> = {};
      for (const s of postScores) scoreMap[s.targetId] = s._sum.value ?? 0;

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          topic: {
            id: topic.id,
            title: topic.title,
            body: topic.body,
            author: topic.author?.name || 'Anônimo',
            viewCount: topic.viewCount,
            createdAt: topic.createdAt,
            score: topicScore._sum.value ?? 0,
          },
          posts: topic.posts.map((p: any) => ({
            id: p.id,
            body: p.body,
            author: p.author?.name || 'Anônimo',
            parentAuthor: p.parent?.author?.name || null,
            createdAt: p.createdAt,
            score: scoreMap[p.id] ?? 0,
          })),
        }),
      };
    }

    // List view: search + pagination (public)
    const pageNum = Math.max(1, parseInt(page || '1', 10));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit || '10', 10)));
    const where: any = { status: 'visible' };
    if (q) {
      where.OR = [
        { title: { contains: q, mode: 'insensitive' } },
        { body: { contains: q, mode: 'insensitive' } },
      ];
    }

    const [topics, total] = await Promise.all([
      prisma.communityTopic.findMany({
        where,
        include: {
          author: { select: { name: true } },
          _count: { select: { posts: { where: { status: 'visible' } } } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.communityTopic.count({ where }),
    ]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        topics: topics.map((t: any) => ({
          id: t.id,
          title: t.title,
          author: t.author?.name || 'Anônimo',
          postsCount: t._count.posts,
          createdAt: t.createdAt,
        })),
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum),
      }),
    };
  }

  // ── POST: create topic, create post, or toggle vote (authenticated) ──
  if (event.httpMethod === 'POST') {
    const auth = await authenticateRequest(event);
    if (!auth.ok) {
      return { statusCode: auth.statusCode, headers, body: JSON.stringify({ error: auth.error }) };
    }
    const user = await resolveUser(auth);
    if (!user) {
      return { statusCode: 401, headers, body: JSON.stringify({ error: 'Usuário não encontrado' }) };
    }

    let body: any = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido en el cuerpo' }) };
    }

    // Create topic
    if (body.action === 'create-topic' || (body.title && !body.action)) {
      const validationError = validateTopicInput(body);
      if (validationError) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: validationError }) };
      }
      const topic = await prisma.communityTopic.create({
        data: {
          title: body.title.trim(),
          body: body.body.trim(),
          authorId: user.id,
        },
      });
      return { statusCode: 201, headers, body: JSON.stringify({ topic }) };
    }

    // Create post / reply
    if (body.action === 'create-post' || (body.topicId && body.body !== undefined)) {
      const validationError = validatePostInput(body);
      if (validationError) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: validationError }) };
      }
      const topic = await prisma.communityTopic.findUnique({
        where: { id: body.topicId },
        select: { id: true, status: true },
      });
      if (!topic || topic.status !== 'visible') {
        return { statusCode: 404, headers, body: JSON.stringify({ error: 'Tema no encontrado' }) };
      }

      // parentId optional — validate it belongs to the same topic
      if (body.parentId) {
        const parent = await prisma.communityPost.findUnique({
          where: { id: body.parentId },
          select: { topicId: true, status: true },
        });
        if (!parent || parent.topicId !== body.topicId || parent.status !== 'visible') {
          return { statusCode: 400, headers, body: JSON.stringify({ error: 'Mensaje padre inválido' }) };
        }
      }

      const post = await prisma.communityPost.create({
        data: {
          topicId: body.topicId,
          parentId: body.parentId || null,
          authorId: user.id,
          body: body.body.trim(),
        },
      });
      return { statusCode: 201, headers, body: JSON.stringify({ post }) };
    }

    // Toggle vote (like/dislike) — applies to topics AND posts.
    // Explicit `action === 'vote'` only: the bare `(targetType && targetId)`
    // fallback would swallow the `report` action below.
    if (body.action === 'vote') {
      const targetType = body.targetType;
      const targetId = body.targetId;
      const value = body.value;
      if (targetType !== 'topic' && targetType !== 'post') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'targetType inválido (topic|post)' }) };
      }
      if (!targetId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'targetId requerido' }) };
      }
      if (value !== 1 && value !== -1) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'value debe ser 1 o -1' }) };
      }

      // Verify the target exists and is visible
      if (targetType === 'topic') {
        const topic = await prisma.communityTopic.findUnique({ where: { id: targetId }, select: { status: true } });
        if (!topic || topic.status !== 'visible') {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Tema no encontrado' }) };
        }
      } else {
        const post = await prisma.communityPost.findUnique({ where: { id: targetId }, select: { status: true } });
        if (!post || post.status !== 'visible') {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mensaje no encontrado' }) };
        }
      }

      const existing = await prisma.communityVote.findUnique({
        where: {
          targetType_targetId_userId: { targetType, targetId, userId: user.id },
        },
      });

      let result;
      if (existing) {
        if (existing.value === value) {
          // Same vote → remove it (toggle off)
          await prisma.communityVote.delete({ where: { id: existing.id } });
          result = { removed: true, value: null };
        } else {
          // Flip the vote
          result = await prisma.communityVote.update({
            where: { id: existing.id },
            data: { value },
          });
          result = { ...result, removed: false };
        }
      } else {
        result = await prisma.communityVote.create({
          data: { targetType, targetId, userId: user.id, value },
        });
        result = { ...result, removed: false };
      }

      const tally = await prisma.communityVote.aggregate({
        where: { targetType, targetId },
        _sum: { value: true },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ vote: result, score: tally._sum.value ?? 0 }),
      };
    }

    // Report content (post-publication moderation: user flag → admin queue)
    if (body.action === 'report') {
      const targetType = body.targetType;
      const targetId = body.targetId;
      if (targetType !== 'topic' && targetType !== 'post') {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'targetType inválido (topic|post)' }) };
      }
      if (!targetId) {
        return { statusCode: 400, headers, body: JSON.stringify({ error: 'targetId requerido' }) };
      }

      if (targetType === 'topic') {
        const topic = await prisma.communityTopic.findUnique({ where: { id: targetId }, select: { status: true } });
        if (!topic || topic.status !== 'visible') {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Tema no encontrado' }) };
        }
        await prisma.communityTopic.update({
          where: { id: targetId },
          data: { reported: true },
        });
      } else {
        const post = await prisma.communityPost.findUnique({ where: { id: targetId }, select: { status: true } });
        if (!post || post.status !== 'visible') {
          return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mensaje no encontrado' }) };
        }
        await prisma.communityPost.update({
          where: { id: targetId },
          data: { reported: true },
        });
      }

      return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Acción no reconocida' }) };
  }

  return {
    statusCode: 405,
    headers: { ...headers, Allow: 'GET, POST' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
