import { getStore } from '@netlify/blobs';
import type { HandlerEvent } from '@netlify/functions';
import { requireBusinessOwner } from './lib/auth';

const STORE_NAME = 'business-images';

const headers: Record<string, string> = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
};

function getBusinessIdFromKey(key: string): string | null {
  if (typeof key !== 'string') return null;
  if (key.includes('..') || key.startsWith('/') || key.includes('\\')) return null;
  const [businessId, ...rest] = key.split('/');
  if (!businessId || rest.length === 0 || rest.some((part) => !part)) return null;
  return businessId;
}

export const handler = async (event: HandlerEvent) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'DELETE') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'DELETE, OPTIONS' },
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    const key = event.queryStringParameters?.key;

    if (!key) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Parâmetro "key" é obrigatório' }),
      };
    }

    // Validate key format to prevent directory traversal and require a business prefix.
    if (typeof key !== 'string' || key.length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Chave inválida' }),
      };
    }

    const businessId = getBusinessIdFromKey(key);
    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Chave inválida' }),
      };
    }

    const auth = await requireBusinessOwner(event, businessId);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode || 401,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    const store = getStore(STORE_NAME);

    // Check if the blob exists before deleting
    const exists = await store.getMetadata(key).catch(() => null);
    if (!exists) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Imagem não encontrada' }),
      };
    }

    await store.delete(key);
    console.log(`🗑️ Image deleted: ${key}`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, message: 'Imagem removida com sucesso' }),
    };
  } catch (error: unknown) {
    console.error('❌ Delete error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao excluir imagem', details: (error as Error).message }),
    };
  }
};
