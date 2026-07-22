import { getStore } from '@netlify/blobs';
import crypto from 'node:crypto';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB
const STORE_NAME = 'business-images';

/**
 * Parse multipart/form-data body (non-streaming for Netlify Functions).
 * Returns the file buffer + metadata and any other form fields.
 */
function parseMultipart(body: Buffer, boundary: string): {
  files: Array<{ fieldname: string; filename: string; contentType: string; data: Buffer }>;
  fields: Record<string, string>;
} {
  const files: Array<{ fieldname: string; filename: string; contentType: string; data: Buffer }> = [];
  const fields: Record<string, string> = {};
  const boundaryMarker = `\r\n--${boundary}`;

  let pos = 0;
  while (pos < body.length) {
    const partStart = body.indexOf(Buffer.from(`--${boundary}\r\n`), pos);
    if (partStart === -1) break;

    const contentStart = partStart + Buffer.from(`--${boundary}\r\n`).length;
    const partEnd = body.indexOf(Buffer.from(boundaryMarker), contentStart);
    if (partEnd === -1) break;

    const rawPart = body.subarray(contentStart, partEnd);
    const headerEnd = rawPart.indexOf('\r\n\r\n');
    if (headerEnd === -1) {
      pos = partEnd + boundaryMarker.length;
      continue;
    }

    const headerStr = rawPart.subarray(0, headerEnd).toString();
    const data = rawPart.subarray(headerEnd + 4);

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
        data,
      });
    } else if (fieldname) {
      // Regular form field
      fields[fieldname] = data.toString().trim();
    }

    // Check for closing boundary
    if (
      partEnd + boundaryMarker.length + 2 <= body.length &&
      body.subarray(partEnd, partEnd + boundaryMarker.length + 2).equals(Buffer.from(`${boundaryMarker}--`))
    ) {
      break;
    }

    pos = partEnd + boundaryMarker.length;
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

    const rawBody = Buffer.from(event.body, 'base64');
    const { files, fields } = parseMultipart(rawBody, boundary);

    // Find the uploaded file (first file part)
    const file = files.find((f) => f.fieldname === 'file') || files[0];
    if (!file) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Nenhum arquivo enviado' }),
      };
    }

    // Validate content type
    if (!ALLOWED_TYPES.includes(file.contentType)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: `Tipo de arquivo não suportado: ${file.contentType}. Permitidos: JPEG, PNG, WebP`,
        }),
      };
    }

    // Validate file size
    if (file.data.length > MAX_SIZE) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Arquivo muito grande. Máximo permitido: 5MB' }),
      };
    }

    const businessId = fields.businessId || 'unknown';
    const ext = file.contentType.split('/')[1];
    const timestamp = Date.now();
    const random = crypto.randomBytes(6).toString('hex');
    const key = `${businessId}/${timestamp}-${random}.${ext}`;

    // Upload to Netlify Blobs
    const store = getStore(STORE_NAME);
    await store.set(key, file.data, { contentType: file.contentType });

    // Construct the blob URL
    const url = `/.netlify/blobs/${STORE_NAME}/${key}`;

    console.log(`✅ Image uploaded: ${key} (${file.data.length} bytes)`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url, key }),
    };
  } catch (error: any) {
    console.error('❌ Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro ao fazer upload da imagem', details: error.message }),
    };
  }
};
