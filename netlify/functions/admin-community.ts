import prisma from './lib/prisma';
import { requireSuperAdmin } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

export const handler = async (event: any) => {
  const auth = await requireSuperAdmin(event);
  if (!auth.ok) {
    return { statusCode: auth.statusCode, headers, body: JSON.stringify({ error: auth.error }) };
  }

  // ── GET: moderation queue (reported + non-visible content) ──
  if (event.httpMethod === 'GET') {
    const params = event.queryStringParameters || {};
    const scope = params.scope || 'reported'; // reported | all

    const topicWhere: any = {};
    const postWhere: any = {};
    if (scope === 'reported') {
      topicWhere.reported = true;
      postWhere.reported = true;
    } else {
      topicWhere.status = { in: ['hidden', 'deleted'] };
      postWhere.status = { in: ['hidden', 'deleted'] };
    }

    const [topics, posts] = await Promise.all([
      prisma.communityTopic.findMany({
        where: topicWhere,
        include: { author: { select: { name: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 100,
      }),
      prisma.communityPost.findMany({
        where: postWhere,
        include: { author: { select: { name: true } }, topic: { select: { title: true } } },
        orderBy: { updatedAt: 'desc' },
        take: 200,
      }),
    ]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        topics: topics.map((t: any) => ({
          id: t.id,
          title: t.title,
          author: t.author?.name || 'Anônimo',
          status: t.status,
          reported: t.reported,
          updatedAt: t.updatedAt,
        })),
        posts: posts.map((p: any) => ({
          id: p.id,
          body: p.body.slice(0, 120),
          author: p.author?.name || 'Anônimo',
          topicTitle: p.topic?.title || '',
          status: p.status,
          reported: p.reported,
          updatedAt: p.updatedAt,
        })),
      }),
    };
  }

  // ── POST: moderate (hide | restore | delete) a topic or post ──
  if (event.httpMethod === 'POST') {
    let body: any = {};
    try {
      body = JSON.parse(event.body || '{}');
    } catch {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'JSON inválido en el cuerpo' }) };
    }

    const { targetType, targetId, action } = body;
    if (targetType !== 'topic' && targetType !== 'post') {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'targetType inválido (topic|post)' }) };
    }
    if (!['hide', 'restore', 'delete'].includes(action)) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'acción inválida (hide|restore|delete)' }) };
    }

    if (targetType === 'topic') {
      const topic = await prisma.communityTopic.findUnique({ where: { id: targetId } });
      if (!topic) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Tema no encontrado' }) };

      if (action === 'delete') {
        await prisma.communityTopic.update({
          where: { id: targetId },
          data: { status: 'deleted', reported: false },
        });
      } else if (action === 'hide') {
        await prisma.communityTopic.update({
          where: { id: targetId },
          data: { status: 'hidden', reported: false },
        });
      } else {
        await prisma.communityTopic.update({
          where: { id: targetId },
          data: { status: 'visible', reported: false },
        });
      }
    } else {
      const post = await prisma.communityPost.findUnique({ where: { id: targetId } });
      if (!post) return { statusCode: 404, headers, body: JSON.stringify({ error: 'Mensaje no encontrado' }) };

      if (action === 'delete') {
        await prisma.communityPost.update({
          where: { id: targetId },
          data: { status: 'deleted', reported: false },
        });
      } else if (action === 'hide') {
        await prisma.communityPost.update({
          where: { id: targetId },
          data: { status: 'hidden', reported: false },
        });
      } else {
        await prisma.communityPost.update({
          where: { id: targetId },
          data: { status: 'visible', reported: false },
        });
      }
    }

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  }

  return {
    statusCode: 405,
    headers: { ...headers, Allow: 'GET, POST' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
