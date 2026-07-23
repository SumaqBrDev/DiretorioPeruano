import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const STORE_NAME = 'business-images';

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

    const businessId = fields.businessId || 'unknown';
    const results: Array<{ url: string; key: string }> = [];
    const errors: Array<{ filename: string; error: string }> = [];

    // Get the store once
    const store = getStore(STORE_NAME);

    for (const file of uploadedFiles) {
      // Validate content type
      if (!ALLOWED_TYPES.includes(file.contentType)) {
        errors.push({
          filename: file.filename,
          error: `Tipo não suportado: ${file.contentType}. Permitidos: JPEG, PNG, WebP`,
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

      // Upload to Netlify Blobs
      await store.set(key, file.data, { contentType: file.contentType });

      // Construct the blob URL
      const url = `/.netlify/blobs/${STORE_NAME}/${key}`;

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
