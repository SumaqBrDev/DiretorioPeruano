import { describe, it, expect, vi } from 'vitest';

import {
  extractBusinessImageKey,
  deleteBusinessGalleryPhoto,
} from '../src/lib/business-gallery-delete';
import { uploadBusinessGalleryFile } from '../src/lib/business-gallery-upload';

describe('BusinessGallery upload helpers', () => {
  it('does not send a protected upload when Clerk token acquisition rejects', async () => {
    const xhr = {
      upload: { addEventListener: vi.fn() },
      addEventListener: vi.fn(),
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(),
    };
    const setError = vi.fn();

    const result = await uploadBusinessGalleryFile({
      file: new File(['image-bytes'], 'ceviche.png', { type: 'image/png' }),
      businessId: 'biz-1',
      getToken: vi.fn().mockRejectedValue(new Error('session expired')),
      createRequest: () => xhr as unknown as XMLHttpRequest,
      onProgress: vi.fn(),
      onError: setError,
    });

    expect(result).toEqual({ success: false });
    expect(xhr.open).toHaveBeenCalledWith('POST', '/api/upload-image');
    expect(xhr.setRequestHeader).not.toHaveBeenCalled();
    expect(xhr.send).not.toHaveBeenCalled();
    expect(setError).toHaveBeenCalledWith('Sessão expirada. Faça login novamente para enviar fotos.');
  });

  it('does not send a protected upload when Clerk returns no token', async () => {
    const xhr = {
      upload: { addEventListener: vi.fn() },
      addEventListener: vi.fn(),
      open: vi.fn(),
      setRequestHeader: vi.fn(),
      send: vi.fn(),
    };

    const result = await uploadBusinessGalleryFile({
      file: new File(['image-bytes'], 'ceviche.png', { type: 'image/png' }),
      businessId: 'biz-1',
      getToken: vi.fn().mockResolvedValue(null),
      createRequest: () => xhr as unknown as XMLHttpRequest,
      onProgress: vi.fn(),
      onError: vi.fn(),
    });

    expect(result.success).toBe(false);
    expect(xhr.send).not.toHaveBeenCalled();
  });
});

describe('BusinessGallery delete helpers', () => {
  it('extracts generated blob-asset keys for the current business only', () => {
    const key = extractBusinessImageKey(
      '/api/blob-asset?store=business-images&key=biz-1%2Fphoto.png',
      'biz-1'
    );

    expect(key).toBe('biz-1/photo.png');
  });

  it('rejects generated blob-asset keys for a different business', () => {
    const key = extractBusinessImageKey(
      '/api/blob-asset?store=business-images&key=biz-2%2Fphoto.png',
      'biz-1'
    );

    expect(key).toBeNull();
  });

  it('keeps the local photo list when the delete request fails', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 403, json: async () => ({ error: 'forbidden' }) });

    const result = await deleteBusinessGalleryPhoto({
      url: '/api/blob-asset?store=business-images&key=biz-1%2Fphoto.png',
      businessId: 'biz-1',
      photos: ['/api/blob-asset?store=business-images&key=biz-1%2Fphoto.png'],
      token: 'session-token',
      fetcher: fetchMock as any,
    });

    expect(result.ok).toBe(false);
    expect(result.photos).toEqual(['/api/blob-asset?store=business-images&key=biz-1%2Fphoto.png']);
    expect(fetchMock).toHaveBeenCalledWith('/api/delete-image?key=biz-1%2Fphoto.png', {
      method: 'DELETE',
      headers: { Authorization: 'Bearer session-token' },
    });
  });
});
