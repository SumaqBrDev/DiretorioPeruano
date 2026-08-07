// netlify/functions/blob-image.ts
// Serves Netlify Blobs through the functions API.
//
// WHY: the conectaperu site does not have the platform Netlify Blobs feature
// enabled, so the canonical /.netlify/blobs/{store}/{key} public path 404s.
// Blob writes/reads via the API (getStore) work fine — this proxy is the
// serving layer: it reads the blob through the API and streams the bytes.
//
// Usage: GET /api/blob-image?store=business-images&key=<blob key>
import { getStore } from '@netlify/blobs';

const DEFAULT_STORE = 'business-images';

const baseHeaders = {
  'Access-Control-Allow-Origin': '*',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
};

const EXT_MIME: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  gif: 'image/gif',
  svg: 'image/svg+xml',
};

function mimeFromKey(key: string): string {
  const ext = key.split('.').pop()?.toLowerCase() || '';
  return EXT_MIME[ext] || 'application/octet-stream';
}

export const handler = async (event: any) => {
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers: { ...baseHeaders, Allow: 'GET' },
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  const key = (event.queryStringParameters?.key || '').trim();
  const storeName = (event.queryStringParameters?.store || DEFAULT_STORE).trim();

  if (!key) {
    return {
      statusCode: 400,
      headers: baseHeaders,
      body: JSON.stringify({ error: 'Parâmetro "key" é obrigatório' }),
    };
  }

  try {
    const store = getStore(storeName);
    // NOTE: only `type: 'text'` works reliably in this deployed runtime —
    // 'arrayBuffer' and 'stream' came back empty (zip-it-and-ship-it bundling).
    const res = await store.get(key, { type: 'text' });

    if (!res) {
      return {
        statusCode: 404,
        headers: baseHeaders,
        body: JSON.stringify({ error: 'Imagem não encontrada' }),
      };
    }

    const data = Buffer.from(res);
    console.log(`[blob-image] key=${key} bytes=${data.length}`);
    return {
      statusCode: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': mimeFromKey(key),
        'Cache-Control': 'public, max-age=3600',
      },
      body: data.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error: any) {
    console.error('[blob-image] read failed:', error);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: 'Erro ao ler a imagem' }),
    };
  }
};
