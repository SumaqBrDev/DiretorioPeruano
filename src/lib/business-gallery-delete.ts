export interface DeleteBusinessGalleryPhotoInput {
  url: string;
  businessId: string;
  photos: string[];
  token: string | null;
  fetcher?: typeof fetch;
}

export interface DeleteBusinessGalleryPhotoResult {
  ok: boolean;
  photos: string[];
  error?: string;
}

export function extractBusinessImageKey(url: string, businessId: string): string | null {
  try {
    const parsed = new URL(url, 'http://local.invalid');
    const store = parsed.searchParams.get('store');
    const key = parsed.searchParams.get('key');
    if (store !== 'business-images' || !key) return null;
    if (key.includes('..') || key.startsWith('/') || key.includes('\\')) return null;
    if (!key.startsWith(`${businessId}/`)) return null;
    return key;
  } catch {
    return null;
  }
}

export async function deleteBusinessGalleryPhoto({
  url,
  businessId,
  photos,
  token,
  fetcher = fetch,
}: DeleteBusinessGalleryPhotoInput): Promise<DeleteBusinessGalleryPhotoResult> {
  const key = extractBusinessImageKey(url, businessId);
  if (!key) {
    return { ok: false, photos, error: 'Imagem inválida para este negócio' };
  }

  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetcher(`/api/delete-image?key=${encodeURIComponent(key)}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    let message = 'Não foi possível remover a foto';
    try {
      const body = await res.json();
      if (typeof body?.error === 'string') message = body.error;
    } catch {
      // keep generic message
    }
    return { ok: false, photos, error: message };
  }

  return { ok: true, photos: photos.filter((p) => p !== url) };
}
