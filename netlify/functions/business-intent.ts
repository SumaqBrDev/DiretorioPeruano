import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
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
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Usuário não encontrado' }),
      };
    }

    // This endpoint records intent only. It never grants role='business'; Stripe
    // webhook promotion is the single trustworthy payment-confirmation path.
    if (user.role !== 'consumer' || user.businessIntentAt) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          ok: true,
          role: user.role,
          businessIntentAt: user.businessIntentAt ?? null,
        }),
      };
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: { businessIntentAt: new Date() },
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ok: true,
        role: updated.role,
        businessIntentAt: updated.businessIntentAt,
      }),
    };
  } catch (error) {
    console.error('[business-intent] failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno ao registrar intenção de cadastro' }),
    };
  }
};
