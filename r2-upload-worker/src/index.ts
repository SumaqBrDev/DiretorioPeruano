export interface Env {
  ASSETS_BUCKET: R2Bucket;
  AUTH_SECRET: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const key = url.pathname.slice(1); // ej: /public/favicon.ico -> public/favicon.ico

    // CORS headers para permitir subidas desde cualquier lado (como el MCP o frontend)
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, PUT, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method === 'GET') {
      if (!key) return new Response('Not found', { status: 404, headers: corsHeaders });
      
      const object = await env.ASSETS_BUCKET.get(key);
      if (!object) return new Response('Not found', { status: 404, headers: corsHeaders });
      
      const headers = new Headers(corsHeaders);
      object.writeHttpMetadata(headers);
      headers.set('etag', object.httpEtag);
      return new Response(object.body, { headers });
    }

    if (request.method === 'PUT') {
      // Basic auth usando un token secreto definido en variables de entorno
      const auth = request.headers.get('Authorization');
      if (!env.AUTH_SECRET || auth !== `Bearer ${env.AUTH_SECRET}`) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }

      await env.ASSETS_BUCKET.put(key, request.body, {
        httpMetadata: { contentType: request.headers.get('Content-Type') || 'application/octet-stream' }
      });

      return new Response(JSON.stringify({ success: true, key }), { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      });
    }

    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  },
};