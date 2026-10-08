// tests/upload-image.test.ts
// Business gallery upload endpoint — focused multipart parser regression coverage.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HandlerEvent } from '@netlify/functions';

vi.mock('../netlify/functions/lib/prisma', () => ({
  default: {
    user: { findUnique: vi.fn() },
    businessProfile: { findFirst: vi.fn(), findUnique: vi.fn() },
  },
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  authenticateRequest: vi.fn(),
}));

vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    set: vi.fn().mockResolvedValue(undefined),
    list: vi.fn(() => (async function* () {
      yield { blobs: [] };
    })()),
  })),
}));

import { handler } from '../netlify/functions/upload-image';
import prisma from '../netlify/functions/lib/prisma';
import { authenticateRequest } from '../netlify/functions/lib/auth';

const authMock = vi.mocked(authenticateRequest);
const userFindMock = vi.mocked(prisma.user.findUnique);
const businessFindFirstMock = vi.mocked(prisma.businessProfile.findFirst);
const businessFindUniqueMock = vi.mocked(prisma.businessProfile.findUnique);

// A real 1x1 PNG (magic bytes 89 50 4E 47...)
const PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c626001000000ffff03000006000557bfabd40000000049454e44ae426082',
  'hex'
);

const boundary = '----galleryboundary123';

function multipartEvent(fileData: Buffer, order: 'file-first' | 'business-first' = 'file-first') {
  const filePart = Buffer.concat([
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="gallery.png"\r\nContent-Type: image/png\r\n\r\n`
    ),
    fileData,
    Buffer.from('\r\n'),
  ]);
  const businessPart = Buffer.from(
    `--${boundary}\r\nContent-Disposition: form-data; name="businessId"\r\n\r\nbiz-1\r\n`
  );
  const body = Buffer.concat([
    ...(order === 'file-first' ? [filePart, businessPart] : [businessPart, filePart]),
    Buffer.from(`--${boundary}--\r\n`),
  ]);

  return {
    httpMethod: 'POST',
    headers: {
      authorization: 'Bearer valid-token',
      'content-type': `multipart/form-data; boundary=${boundary}`,
    },
    queryStringParameters: undefined,
    body: body.toString('base64'),
    isBase64Encoded: true,
  } as unknown as HandlerEvent;
}

beforeEach(() => {
  vi.clearAllMocks();
  authMock.mockResolvedValue({ ok: true, clerkId: 'user_test' } as any);
  userFindMock.mockResolvedValue({ id: 'user-internal-1', role: 'consumer' } as any);
  businessFindFirstMock.mockResolvedValue({ id: 'biz-1' } as any);
  businessFindUniqueMock.mockResolvedValue({ photos: [] } as any);
});

describe('upload-image multipart parsing', () => {
  it('uploads a valid PNG when the multipart body sends file before businessId', async () => {
    const res = await handler(multipartEvent(PNG_BYTES));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.totalUploaded).toBe(1);
    expect(body.urls[0].key).toContain('biz-1/');
  });

  it('uploads a valid PNG when the multipart body sends businessId before file', async () => {
    const res = await handler(multipartEvent(PNG_BYTES, 'business-first'));

    expect(res.statusCode).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.totalUploaded).toBe(1);
    expect(body.urls[0].key).toContain('biz-1/');
  });
});
