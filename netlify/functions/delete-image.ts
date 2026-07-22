import { getStore } from '@netlify/blobs';

const STORE_NAME = 'business-images';

export const handler = async (event: any) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'DELETE, OPTIONS',
  };

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

    // Validate key format to prevent directory traversal
    if (typeof key !== 'string' || key.includes('..') || key.length < 10) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Chave inválida' }),
      };
    }

    const store = getStore(STORE_NAME);

    // Check if the blob exists before deleting
    const exists = await store.get(key, { type: 'metadata' }).catch(() => null);
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
  } catch (error: any) {
    console.error('❌ Delete error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao excluir imagem', details: error.message }),
    };
  }
};
