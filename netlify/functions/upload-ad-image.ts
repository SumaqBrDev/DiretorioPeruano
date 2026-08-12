// netlify/functions/upload-ad-image.ts
// Upload ONE ad image (local file) — same security pattern as upload-image.ts
// (Clerk auth, magic-byte validation, 5MB cap, Netlify Blobs) but scoped to a
// dedicated `ad-images` store so ad images never collide with the gallery's
// 10-photo cap. The caller then sends the returned URL as ad.imageUrl.
import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';
import prisma from './lib/prisma';
import { authenticateRequest } from './lib/auth';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const STORE_NAME = 'ad-images';

/** Magic-byte signatures — validates REAL content, not the declared type. */
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
  if (
    data.length >= 12 &&
    data.toString('ascii', 0, 4) === 'RIFF' &&
    data.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  return null;
}

/** Parse multipart/form-data body (non-streaming, Netlify Functions v1). */
function parseMultipart(body: Buffer, boundary: string): {
  files: Array<{ fieldname: string; filename: string; contentType: string; data: Buffer }>;
  fields: Record<string, string>;
} {
  const files: Array<{ fieldname: string; filename: string; contentType: string; data: Buffer }> = [];
  const fields: Record<string, string> = {};
  const boundaryStrBuf = Buffer.from(`\r\n--${boundary}`);
  const endBoundaryStrBuf = Buffer.from(`\r\n--${boundary}--`);

  let pos = 0;
  let iterations = 0;
  const MAX_ITERATIONS = 100;

  while (pos < body.length && iterations < MAX_ITERATIONS) {
    iterations++;
    const partStart = body.indexOf(Buffer.from(`--${boundary}\r\n`), pos);
    if (partStart === -1) break;

    const contentStart = partStart + Buffer.from(`--${boundary}\r\n`).length;
    let partEnd = body.indexOf(boundaryStrBuf, contentStart);
    const endBoundaryPos = body.indexOf(endBoundaryStrBuf, contentStart);
    if (endBoundaryPos !== -1 && (partEnd === -1 || endBoundaryPos < partEnd)) {
      partEnd = endBoundaryPos;
    }
    if (partEnd === -1) break;

    const rawPart = body.subarray(contentStart, partEnd);
    const headerEnd = rawPart.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      pos = partEnd + boundaryStrBuf.length;
      continue;
    }

    const headerStr = rawPart.subarray(0, headerEnd).toString();
    const data = rawPart.subarray(headerEnd + 4);
    const cleanData = data.length >= 2 && data.subarray(data.length - 2).equals(Buffer.from('\r\n'))
      ? data.subarray(0, data.length - 2)
      : data;

    const nameMatch = headerStr.match(/name="([^"]+)"/);
    const filenameMatch = headerStr.match(/filename="([^"]*)"/);
    const ctMatch = headerStr.match(/Content-Type:\s*(\S+)/i);

    const fieldname = nameMatch?.[1] || '';

    if (filenameMatch && ctMatch) {
      files.push({
        fieldname,
        filename: filenameMatch[1],
        contentType: ctMatch[1],
        data: cleanData,
      });
    } else if (fieldname) {
      fields[fieldname] = data.toString().trim();
    }

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

    const rawBody = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64')
      : Buffer.from(event.body || '');

    const { files, fields } = parseMultipart(rawBody, boundary);
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

    // One ad image per request — take the first file only.
    const file = uploadedFiles[0];

    if (!ALLOWED_TYPES.includes(file.contentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Tipo não suportado: ${file.contentType}. Permitidos: JPEG, PNG, WebP`,
        }),
      };
    }

    const detected = detectImageType(file.data);
    if (detected === null || detected !== file.contentType) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'Arquivo inválido: o conteúdo não corresponde a uma imagem JPEG, PNG ou WebP',
        }),
      };
    }

    if (file.data.length > MAX_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Arquivo muito grande. Máximo permitido: 5MB' }),
      };
    }

    const ext = file.contentType.split('/')[1];
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const key = `${businessId}/ad-${timestamp}-${random}.${ext}`;

    const store = getStore(STORE_NAME);
    // Same base64 trick as upload-image.ts: the token-based blob API mangles
    // raw non-UTF8 bytes; base64 survives the round-trip byte-exact.
    await store.set(key, new Blob([file.data.toString('base64')], { type: 'text/plain' }));

    const url = `/api/blob-asset?store=${encodeURIComponent(STORE_NAME)}&key=${encodeURIComponent(key)}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        url,
        key,
        filename: file.filename,
      }),
    };
  } catch (error: any) {
    console.error('❌ Upload ad image error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Erro ao fazer upload da imagem do anúncio',
        details: error.message,
      }),
    };
  }
};
