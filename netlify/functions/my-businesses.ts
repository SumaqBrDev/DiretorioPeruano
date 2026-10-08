import type { HandlerEvent } from '@netlify/functions';
import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';
import { listOwnedBusinesses } from './lib/ownership';

const headers = {
  'Content-Type': 'application/json',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

export const handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'GET' },
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const auth = await authenticateRequest(event);
  if (!auth.ok) {
    return { statusCode: auth.statusCode || 401, headers, body: JSON.stringify({ error: auth.error }) };
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: auth.clerkId! },
    select: { id: true },
  });

  if (!user) {
    return { statusCode: 404, headers, body: JSON.stringify({ error: 'Usuario no encontrado' }) };
  }

  const businesses = await listOwnedBusinesses(user.id);
  return { statusCode: 200, headers, body: JSON.stringify({ businesses }) };
};
