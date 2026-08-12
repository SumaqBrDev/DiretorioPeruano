// tests/upload-ad-image.test.ts
// Ad image upload endpoint — auth scoping, file validation (magic bytes),
// and store behavior. Mocked deps — no DATABASE_URL or real blobs needed.

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    set: vi.fn().mockResolvedValue(undefined),
    get: vi.fn().mockResolvedValue(null),
    list: vi.fn().mockResolvedValue({ blobs: [] }),
  })),
}));

import { handler } from '../netlify/functions/upload-ad-image';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const userFindMock = vi.mocked(prisma.user.findUnique);

// A real 1x1 PNG (magic bytes 89 50 4E 47...)
const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
  'hex'
);

const boundary = '----testboundary123';

function multipartEvent(fileData: Buffer, overrides: any = {}) {
  // NOTE: mirror the REAL frontend order — file part FIRST, businessId after.
  // parseMultipart (shared with upload-image.ts) only reliably reads the
  // first part; the businessId field then falls back to user.business.id.
  const body = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="ad.png"\r\nContent-Type: image/png\r\n\r\n`
    ),
    fileData,
    Buffer.from(
      `\r\n--${boundary}\r\nContent-Disposition: form-data; name="businessId"\r\n\r\nbiz-1\r\n--${boundary}--\r\n`
    ),
  ]);
  return {
    httpMethod: 'POST',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': `multipart/form-data; boundary=${boundary}`,
      ...overrides.headers,
    },
    body: body.toString('base64'),
    isBase64Encoded: true,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ ok: true, clerkId: 'user_test' } as any);
  userFindMock.mockResolvedValue({
    id: 'user-internal-1',
    role: 'consumer',
    business: { id: 'biz-1' },
  } as any);
});

describe('upload-ad-image', () => {
  it('rejects unauthenticated requests', async () => {
    authMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado' } as any);
    const res = await handler(multipartEvent(PNG_BYTES));
    expect(res.statusCode).toBe(401);
  });

  it('rejects a user with no business (businessId resolves from the authed user only)', async () => {
    userFindMock.mockResolvedValue({
      id: 'user-internal-1',
      role: 'consumer',
      business: null,
    } as any);
    const res = await handler(multipartEvent(PNG_BYTES));
    expect(res.statusCode).toBe(400);
  });

  it('rejects non-image content (magic bytes mismatch)', async () => {
    const fakePdf = Buffer.from('%PDF-1.4 fake content that is not an image');
    const res = await handler(multipartEvent(fakePdf));
    expect(res.statusCode).toBe(400);
    expect(JSON.parse(res.body).error).toContain('Arquivo inválido');
  });

  it('uploads a valid PNG and returns the blob URL with ad-images store', async () => {
    const res = await handler(multipartEvent(PNG_BYTES));
    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    // store + key are URL-encoded in the query string (%2F for the slash)
    expect(body.url).toContain('/api/blob-asset?store=ad-images&key=');
    expect(decodeURIComponent(body.url)).toContain('key=biz-1/ad-');
    expect(body.key).toContain('biz-1/ad-');
  });

  it('rejects non-POST methods', async () => {
    const res = await handler({ httpMethod: 'GET', headers: {} });
    expect(res.statusCode).toBe(405);
  });
});
