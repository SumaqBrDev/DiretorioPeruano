import { describe, it, expect, vi, beforeEach } from 'vitest';

const deleteMock = vi.fn();
const getMetadataMock = vi.fn();

vi.mock('@netlify/blobs', () => ({
  getStore: vi.fn(() => ({
    getMetadata: getMetadataMock,
    delete: deleteMock,
  })),
}));

vi.mock('../netlify/functions/lib/auth', () => ({
  requireBusinessOwner: vi.fn(),
}));

import { handler } from '../netlify/functions/delete-image';
import { requireBusinessOwner } from '../netlify/functions/lib/auth';

const ownerMock = vi.mocked(requireBusinessOwner);

function deleteEvent(key: string, headers: Record<string, string> = { authorization: 'Bearer token' }): any {
  return {
    httpMethod: 'DELETE',
    headers,
    queryStringParameters: { key },
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  getMetadataMock.mockResolvedValue({ etag: 'blob' });
  ownerMock.mockResolvedValue({ ok: true, ownerBusinessId: 'biz-1', userId: 'user-1' } as any);
});

describe('delete-image security', () => {
  it('rejects unauthenticated deletion attempts', async () => {
    ownerMock.mockResolvedValue({ ok: false, statusCode: 401, error: 'No autorizado — token requerido' } as any);

    const res = await handler(deleteEvent('biz-1/photo.png', {}));

    expect(res.statusCode).toBe(401);
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('rejects deletion outside the authenticated owner business prefix', async () => {
    ownerMock.mockResolvedValue({ ok: false, statusCode: 403, error: 'Acceso denegado — este negocio no pertenece al usuario autenticado.' } as any);

    const res = await handler(deleteEvent('biz-2/photo.png'));

    expect(res.statusCode).toBe(403);
    expect(ownerMock).toHaveBeenCalledWith(expect.anything(), 'biz-2');
    expect(deleteMock).not.toHaveBeenCalled();
  });

  it('deletes only keys from the authenticated owner business prefix', async () => {
    const res = await handler(deleteEvent('biz-1/photo.png'));

    expect(res.statusCode).toBe(200);
    expect(ownerMock).toHaveBeenCalledWith(expect.anything(), 'biz-1');
    expect(deleteMock).toHaveBeenCalledWith('biz-1/photo.png');
  });
});
