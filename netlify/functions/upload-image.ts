import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const MAX_PHOTOS_PER_BUSINESS = 10;
const STORE_NAME = 'business-images';

/** Magic-byte signatures for the allowed image formats (validated against the
 * REAL file content, not just the client-declared Content-Type — a PDF renamed
 * to .jpg must be rejected). */
function detectImageType(data: Buffer): string | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) {
    return 'image/jpeg';
  }
  if (
    data.length >= 8 &&
    data[0] === 0x89 && data[1] === 0x50 && data[2] === 0x4e && data[3] === 0x47 &&
    data[4] === 0x0d && data[5] === 0x0a && data[6] === 0x1a && data[7] === 0x0a
  ) {
    return 'image/png';
  }
  // WebP: "RIFF" .... "WEBP"
  if (
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/**
 * Parse multipart/form-data body (non-streaming for Netlify Functions v1).
 * Returns the file buffer + metadata and any other form fields.
 */
function parseMultipart(body: Buffer, boundary: string): {
  files: Array<{ fieldname: string; filename: string; contentType: string; data: Buffer }>;
  fields: Record<string, string>;
} {
  const files: Array<{ fieldname: string; filename: string; contentType: string; data: Buffer }> = [];
  const fields: Record<string, string> = {};
  const boundaryStr = `--${boundary}`;
  const boundaryStrBuf = Buffer.from(`\r\n--${boundary}`);
  const endBoundaryStrBuf = Buffer.from(`\r\n--${boundary}--`);

  // Find all parts between boundaries
  let pos = 0;
  let iterations = 0;
  const MAX_ITERATIONS = 100; // safety limit

  while (pos < body.length && iterations < MAX_ITERATIONS) {
    iterations++;

    // Seek to the next boundary start
    const partStart = body.indexOf(Buffer.from(`--${boundary}\r\n`), pos);
    if (partStart === -1) break;

    // Move past the boundary line
    const contentStart = partStart + Buffer.from(`--${boundary}\r\n`).length;

    // Find where this part ends (next boundary)
    let partEnd = body.indexOf(boundaryStrBuf, contentStart);
    const endBoundaryPos = body.indexOf(endBoundaryStrBuf, contentStart);
    if (endBoundaryPos !== -1 && (partEnd === -1 || endBoundaryPos < partEnd)) {
      partEnd = endBoundaryPos;
    }
    if (partEnd === -1) break;

    const rawPart = body.subarray(contentStart, partEnd);

    // Skip the trailing \r\n before the next boundary
    if (rawPart.length >= 2 && rawPart.subarray(rawPart.length - 2).equals(Buffer.from('\r\n'))) {
      // Keep the trailing \r\n as part of the data, but the header boundaries are fine
    }

    const headerEnd = rawPart.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      pos = partEnd + boundaryStrBuf.length;
      continue;
    }

    const headerStr = rawPart.subarray(0, headerEnd).toString();
    const data = rawPart.subarray(headerEnd + 4);

    // Remove trailing \r\n that some clients add before boundary
    const cleanData = data.length >= 2 && data.subarray(data.length - 2).equals(Buffer.from('\r\n'))
      ? data.subarray(0, data.length - 2)
      : data;

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]*)"/);
    const ctMatch = headerStr.match(/Content-Type:\s*(\S+)/i);

    const fieldname = nameMatch?.[1] || '';

    if (filenameMatch && ctMatch) {
      // File field
      files.push({
        fieldname,
        filename: filenameMatch[1],
        contentType: ctMatch[1],
        data: cleanData,
      });
    } else if (fieldname) {
      // Regular form field
      fields[fieldname] = data.toString().trim();
    }

    // Check if we hit the closing boundary
    if (endBoundaryPos !== -1 && endBoundaryPos <= partEnd + boundaryStrBuf.length) {
      break;
    }

    pos = partEnd + boundaryStrBuf.length;
  }

  return { files, fields };
}

export const handler = async (event: any) => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { ...headers, Allow: 'POST, OPTIONS' },
      body: JSON.stringify({ error: 'Método não permitido' }),
    };
  }

  try {
    // BUG-032c: the endpoint must not accept uploads from anonymous callers —
    // authenticate the session and scope uploads to the caller's own business.
    const auth = await authenticateRequest(event);
    if (!auth.ok) {
      return {
        statusCode: auth.statusCode,
        headers,
        body: JSON.stringify({ error: auth.error }),
      };
    }

    const user = await prisma.user.findUnique({
      where: { clerkId: auth.clerkId! },
      select: { id: true, role: true, business: { select: { id: true } } },
    });

    if (!user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Usuário não encontrado' }),
      };
    }

    const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
    if (!contentType.includes('multipart/form-data')) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Content-Type deve ser multipart/form-data' }),
      };
    }

    const boundary = contentType.split('boundary=')[1];
    if (!boundary) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Boundary não encontrado no Content-Type' }),
      };
    }

    // Handle both base64-encoded and raw body
    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '');

    const { files, fields } = parseMultipart(rawBody, boundary);

    // Find uploaded files (fieldname 'file' or any file part)
    const uploadedFiles = files.length > 0
      ? files.filter((f) => f.fieldname === 'file' || f.filename)
      : [];

    if (uploadedFiles.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Nenhum arquivo enviado' }),
      };
    }

    // BUG-032b: enforce the 10-photo cap server-side. Only the business owner
    // may upload to their gallery — superadmin keeps access for moderation.
    const businessId = fields.businessId || user.business?.id || '';
    if (!businessId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'businessId é obrigatório' }),
      };
    }

    const ownsBusiness = user.business?.id === businessId || user.role === 'superadmin';
    if (!ownsBusiness) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Acesso negado — este negócio não pertence ao usuário' }),
      };
    }

    const current = await prisma.businessProfile.findUnique({
      where: { id: businessId },
      select: { photos: true },
    });
    const currentCount = current?.photos?.length ?? 0;

    // BUG-032b: the DB `photos` array only updates AFTER the frontend persists
    // the upload (PUT /api/my-business), so an attacker hitting this endpoint
    // directly could exceed the cap without ever touching the DB. Count the
    // REAL blobs already stored for this business and enforce the cap on that.
    const store = getStore(STORE_NAME);
    let storedCount = 0;
    try {
      const listing = await store.list({ prefix: `${businessId}/` });
      storedCount = listing?.blobs?.length ?? 0;
    } catch (err) {
      console.warn('[upload-image] blob list failed, falling back to DB count:', (err as Error).message);
    }
    const effectiveCount = Math.max(currentCount, storedCount);
    const remaining = MAX_PHOTOS_PER_BUSINESS - effectiveCount;
    const acceptedFiles = uploadedFiles.slice(0, Math.max(0, remaining));
    const overLimit = uploadedFiles.length - acceptedFiles.length;

    if (acceptedFiles.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Limite máximo de ${MAX_PHOTOS_PER_BUSINESS} fotos atingido`,
        }),
      };
    }

    const results: Array<{ url: string; key: string }> = [];
    const errors: Array<{ filename: string; error: string }> = [];
    if (overLimit > 0) {
      errors.push({
        filename: '(excesso)',
        error: `Limite máximo de ${MAX_PHOTOS_PER_BUSINESS} fotos. ${overLimit} arquivo(s) ignorado(s).`,
      });
    }

    // Get the store once (declared above for the blob-count cap)
    for (const file of acceptedFiles) {
      // Validate content type (declared)
      if (!ALLOWED_TYPES.includes(file.contentType)) {
        errors.push({
          filename: file.filename,
          error: `Tipo não suportado: ${file.contentType}. Permitidos: JPEG, PNG, WebP`,
        });
        continue;
      }

      // BUG-032: validate the REAL content via magic bytes — a PDF renamed to
      // .jpg declares image/jpeg but must be rejected.
      const detected = detectImageType(file.data);
      if (detected === null || detected !== file.contentType) {
        errors.push({
          filename: file.filename,
          error: 'Arquivo inválido: o conteúdo não corresponde a uma imagem JPEG, PNG ou WebP',
        });
        continue;
      }

      // Validate file size
      if (file.data.length > MAX_SIZE) {
        errors.push({
          filename: file.filename,
          error: 'Arquivo muito grande. Máximo permitido: 5MB',
        });
        continue;
      }

      const ext = file.contentType.split('/')[1];
      const timestamp = Date.now();
      const random = crypto.randomBytes(6).toString('hex');
      const key = `${businessId}/${timestamp}-${random}.${ext}`;

      // Upload to Netlify Blobs — the Blob carries the content type (the v10
      // SDK has no contentType option on set(); Blob.type is used when serving).
      // Store base64 (ASCII) — the token-based blob API mangles raw non-UTF8
      // bytes (0x89 -> EF BF BD); base64 survives the round-trip byte-exact.
      await store.set(key, new Blob([file.data.toString('base64')], { type: 'text/plain' }));

      // Construct the blob URL
      const url = `/api/blob-asset?store=${encodeURIComponent(STORE_NAME)}&key=${encodeURIComponent(key)}`;

      results.push({ url, key });
      console.log(`✅ Image uploaded: ${key} (${file.data.length} bytes)`);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        urls: results,
        errors: errors.length > 0 ? errors : undefined,
        totalUploaded: results.length,
        totalErrors: errors.length,
      }),
    };
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro ao fazer upload da imagem',
        details: error.message,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      }),
    };
  }
};
