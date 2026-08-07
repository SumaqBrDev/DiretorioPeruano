// netlify/functions/blob-asset.ts
// Serves Netlify Blobs through the functions API.
//
// WHY: the conectaperu site does not have the platform Netlify Blobs feature
// enabled, so the canonical /.netlify/blobs/{store}/{key} public path 404s.
// Blob writes/reads via the API (getStore) work fine — this proxy is the
// serving layer: it reads the blob through the API and streams the bytes.
//
// Returns a fetch-style Response (Netlify Functions v2) so binary data is
// streamed without the legacy {statusCode, body, isBase64Encoded} JSON
// round-trip, which corrupted non-ASCII bytes (0x89 -> EF BF BD).
//
// Usage: GET /api/blob-asset?store=business-images&key=<blob key>
import { getStore } from '@netlify/blobs';

const DEFAULT_STORE = 'business-images';

const baseHeaders: Record<string, string> = {
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
    return new Response(JSON.stringify({ error: 'Método não permitido' }), {
      status: 405,
      headers: { ...baseHeaders, Allow: 'GET' },
    });
  }

  const key = (event.queryStringParameters?.key || '').trim();
  const storeName = (event.queryStringParameters?.store || DEFAULT_STORE).trim();

  if (!key) {
    return new Response(JSON.stringify({ error: 'Parâmetro "key" é obrigatório' }), {
      status: 400,
      headers: baseHeaders,
    });
  }

  try {
    const store = getStore(storeName);
    // NOTE: only `type: 'text'` works reliably in this deployed runtime —
    // 'arrayBuffer' and 'stream' came back empty (zip-it-and-ship-it bundling).
    const res = await store.get(key, { type: 'text' });

    if (!res) {
      return new Response(JSON.stringify({ error: 'Imagem não encontrada' }), {
        status: 404,
        headers: baseHeaders,
      });
    }

    // Stored payload is base64 (see upload-image: the token-based blob API
    // mangles raw non-UTF8 bytes, so we store ASCII and decode here).
    const data = Buffer.from(res, 'base64');
    console.log(`[blob-asset] key=${key} bytes=${data.length}`);
    return new Response(data, {
      status: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': mimeFromKey(key),
        // NO caching: the edge (Netlify Durable) cache mismatched bodies across
        // keys for this function (observed: key A served key B's bytes). Each
        // request must hit the function.
        'Cache-Control': 'no-store',
      },
    });
  } catch (error: any) {
    console.error('[blob-asset] read failed:', error);
    return new Response(JSON.stringify({ error: 'Erro ao ler a imagem' }), {
      status: 500,
      headers: baseHeaders,
    });
  }
};
