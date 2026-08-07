import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';

export const handler = async (event: any) => {
  const headers = {
    'Content-Type': 'application/json',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  };

  // Authenticate + resolve the caller's own business ONCE for POST and GET.
  // (BUG-019: the endpoint previously trusted client-supplied business ids,
  // so anyone could spoof messages as any business or read any inbox.)
  const auth = await authenticateRequest(event);
  if (!auth.ok) {
    return {
      statusCode: auth.statusCode || 401,
      headers,
      body: JSON.stringify({ error: auth.error || 'No autorizado' }),
    };
  }
  const user = await prisma.user.findUnique({ where: { clerkId: auth.clerkId! } });
  if (!user) {
    return {
      statusCode: 401,
      headers,
      body: JSON.stringify({ error: 'Usuário não encontrado' }),
    };
  }
  const business = await prisma.businessProfile.findUnique({ where: { ownerId: user.id } });
  if (!business) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Este usuário não possui um negócio' }),
    };
  }
  const businessId = business.id;

  // POST — Send a new message (fromBusinessId derived from the token)
  if (event.httpMethod === 'POST') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { toBusinessId, body: messageBody } = body;

      if (!toBusinessId || !messageBody) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Campos obrigatórios: toBusinessId, body' }),
        };
      }

      const message = await prisma.message.create({
        data: {
          fromBusinessId: businessId,
          toBusinessId,
          body: messageBody,
          read: false,
        },
      });

      return {
        statusCode: 201,
        headers,
        body: JSON.stringify(message),
      };
    } catch (error: any) {
      console.error('Error creating message:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao enviar mensagem' }),
      };
    }
  }

  // GET — List messages / conversations (businessId derived from the token)
  if (event.httpMethod === 'GET') {
    try {
      const params = event.queryStringParameters || {};
      const { conversationWith, archived, includeDeleted } = params;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const whereBase: any = {
        OR: [
          { fromBusinessId: businessId },
          { toBusinessId: businessId },
        ],
        // Exclude permanently deleted (older than 30 days)
        OR_deleted: undefined,
      };

      // Handle soft-delete filtering
      const deletedFilter: any = {};
      if (includeDeleted !== 'true') {
        deletedFilter.deletedAt = null;
      } else {
        deletedFilter.OR = [
          { deletedAt: null },
          { deletedAt: { gte: thirtyDaysAgo } },
        ];
      }

      // If fetching a specific conversation
      if (conversationWith) {
        const messages = await prisma.message.findMany({
          where: {
            ...deletedFilter,
            OR: [
              { fromBusinessId: businessId, toBusinessId: conversationWith },
              { fromBusinessId: conversationWith, toBusinessId: businessId },
            ],
          },
          orderBy: { createdAt: 'asc' },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify(messages),
        };
      }

      // Fetch all conversations for this business
      const messages = await prisma.message.findMany({
        where: {
          ...deletedFilter,
          OR: [
            { fromBusinessId: businessId },
            { toBusinessId: businessId },
          ],
        },
        orderBy: { createdAt: 'desc' },
        include: {
          fromBusiness: { select: { id: true, name: true } },
          toBusiness: { select: { id: true, name: true } },
        },
      });

      // Group by conversation partner
      const conversationsMap = new Map();
      for (const msg of messages) {
        const partnerId = msg.fromBusinessId === businessId ? msg.toBusinessId : msg.fromBusinessId;
        const partnerName = msg.fromBusinessId === businessId
          ? msg.toBusiness?.name || 'Desconhecido'
          : msg.fromBusiness?.name || 'Desconhecido';

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            businessId: partnerId,
            businessName: partnerName,
            archived: msg.fromBusinessId === businessId
              ? (msg as any).archived || false
              : (msg as any).archived || false,
            deletedAt: msg.deletedAt,
            messages: [],
            lastMessage: msg.body,
            lastMessageAt: msg.createdAt,
            unread: !msg.read && msg.toBusinessId === businessId ? 1 : 0,
          });
        }

        const conv = conversationsMap.get(partnerId);
        if (!msg.read && msg.toBusinessId === businessId) {
          conv.unread = (conv.unread || 0) + 1;
        }
      }

      // Filter by archived status if specified
      let result = Array.from(conversationsMap.values());
      if (archived === 'true') {
        result = result.filter(c => c.archived === true);
      } else if (archived !== 'all') {
        result = result.filter(c => !c.archived && !c.deletedAt);
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    } catch (error) {
      console.error('Error fetching messages:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to fetch messages' }),
      };
    }
  }

  // PUT — Update message (mark as read, archive conversation)
  // businessId comes from the authenticated token (BUG-022: the body value
  // used to shadow it, letting callers archive/delete other businesses' chats).
  if (event.httpMethod === 'PUT') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { action, messageId, partnerBusinessId } = body;

      if (action === 'mark-read' && messageId) {
        await prisma.message.update({
          where: { id: messageId, toBusinessId: businessId },
          data: { read: true },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }

      if (action === 'archive' && businessId && partnerBusinessId) {
        // Mark all messages in this conversation as archived
        await prisma.message.updateMany({
          where: {
            OR: [
              { fromBusinessId: businessId, toBusinessId: partnerBusinessId },
              { fromBusinessId: partnerBusinessId, toBusinessId: businessId },
            ],
          },
          data: { archived: true },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }

      if (action === 'unarchive' && businessId && partnerBusinessId) {
        await prisma.message.updateMany({
          where: {
            OR: [
              { fromBusinessId: businessId, toBusinessId: partnerBusinessId },
              { fromBusinessId: partnerBusinessId, toBusinessId: businessId },
            ],
          },
          data: { archived: false },
        });

        return {
          statusCode: 200,
          headers,
          body: JSON.stringify({ success: true }),
        };
      }

      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Ação inválida' }),
      };
    } catch (error: any) {
      console.error('Error updating messages:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao atualizar mensagens' }),
      };
    }
  }

  // DELETE — Soft delete a conversation (businessId derived from the token)
  if (event.httpMethod === 'DELETE') {
    try {
      const body = JSON.parse(event.body || '{}');
      const { partnerBusinessId } = body;

      if (!partnerBusinessId) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'partnerBusinessId é obrigatório' }),
        };
      }

      await prisma.message.updateMany({
        where: {
          OR: [
            { fromBusinessId: businessId, toBusinessId: partnerBusinessId },
            { fromBusinessId: partnerBusinessId, toBusinessId: businessId },
          ],
        },
        data: { deletedAt: new Date() },
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ success: true, message: 'Conversa arquivada por 30 dias' }),
      };
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Erro ao excluir conversa' }),
      };
    }
  }

  return {
    statusCode: 405,
    headers: { ...headers, Allow: 'GET, POST, PUT, DELETE' },
    body: JSON.stringify({ error: 'Method not allowed' }),
  };
};
