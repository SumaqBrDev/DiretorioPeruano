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
  const json = (statusCode: number, obj: Record<string, unknown>) => ({
    statusCode,
    headers: baseHeaders,
    body: JSON.stringify(obj),
  });

  if (event.httpMethod !== 'GET') {
    return json(405, { error: 'Método não permitido' });
  }

  const key = (event.queryStringParameters?.key || '').trim();
  const storeName = (event.queryStringParameters?.store || DEFAULT_STORE).trim();

  if (!key) {
    return json(400, { error: 'Parâmetro "key" é obrigatório' });
  }

  try {
    const store = getStore(storeName);
    // NOTE: only `type: 'text'` works reliably in this deployed runtime —
    // 'arrayBuffer' and 'stream' came back empty (zip-it-and-ship-it bundling).
    const res = await store.get(key, { type: 'text' });

    if (!res) {
      return json(404, { error: 'Imagem não encontrada' });
    }

    // Stored payload is base64 (see upload-image: the token-based blob API
    // mangles raw non-UTF8 bytes, so we store ASCII and decode here).
    const data = Buffer.from(res, 'base64');
    console.log(`[blob-asset] key=${key} bytes=${data.length}`);
    // Legacy response shape: the deployed runtime rejects `new Response(Buffer)`
    // ("error decoding lambda response") and mangles raw non-UTF8 strings, but
    // isBase64Encoded + base64 body decodes byte-exact.
    return {
      statusCode: 200,
      headers: {
        ...baseHeaders,
        'Content-Type': mimeFromKey(key),
        // NO caching: the edge (Netlify Durable) cache mismatched bodies across
        // keys for this function. Each request must hit the function.
        'Cache-Control': 'no-store',
      },
      body: data.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (error: any) {
    console.error('[blob-asset] read failed:', error);
    return {
      statusCode: 500,
      headers: baseHeaders,
      body: JSON.stringify({ error: 'Erro ao ler a imagem' }),
    };
  }
};
