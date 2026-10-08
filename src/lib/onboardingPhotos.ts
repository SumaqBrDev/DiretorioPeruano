// src/lib/onboardingPhotos.ts
// Photo handling for business registration.
//
// Registration used to read every photo with FileReader.readAsDataURL and
// inline the base64 strings in the JSON body of POST /api/businesses. Netlify
// Functions cap a buffered request at 6MB and base64 inflates bytes by ~33%,
// so a handful of ordinary phone photos returned HTTP 413 and the business
// was never created.
//
// Photos now travel as multipart to /api/upload-image, one request per file,
// AFTER the business exists (that endpoint scopes uploads to a business the
// caller owns). The returned URLs are then persisted on the business row.
import { compressImage } from './imageCompression';

/** Netlify's buffered request cap for a synchronous function. */
export const FUNCTION_PAYLOAD_LIMIT_BYTES = 6 * 1024 * 1024;

/** Per-file cap enforced by /api/upload-image. Mirrored here to fail early. */
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

/**
 * Bytes a raw payload occupies once base64-encoded.
 *
 * base64 encodes every 3 bytes as 4 characters, so the size grows by ~33%.
 * Exposed to make the old failure measurable instead of anecdotal.
 */
export function estimateBase64PayloadBytes(rawBytes: number): number {
  return Math.ceil(rawBytes / 3) * 4;
}

export interface UploadedPhoto {
  url: string;
  key: string;
}

export interface PhotoUploadResponse {
  urls: UploadedPhoto[];
  errors?: Array<{ filename: string; error: string }>;
}

export interface UploadOnboardingPhotosInput {
  files: File[];
  businessId: string;
  token: string;
  /** Injected for testing; defaults to the real multipart POST. */
  upload?: (args: { file: File; businessId: string; token: string }) => Promise<PhotoUploadResponse>;
}

export interface UploadOnboardingPhotosResult {
  /** URLs of the photos that stored successfully, in input order. */
  urls: string[];
  /** Filenames that did not store, so the user can be told exactly which. */
  failed: string[];
}

async function defaultUpload({
  file,
  businessId,
  token,
}: {
  file: File;
  businessId: string;
  token: string;
}): Promise<PhotoUploadResponse> {
  const form = new FormData();
  form.append('file', file);
  form.append('businessId', businessId);

  const res = await fetch('/api/upload-image', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.json().catch(() => ({}));
    throw new Error(detail?.error || `Falha no upload (HTTP ${res.status})`);
  }
  return res.json();
}

/**
 * Upload registration photos one request at a time.
 *
 * Sequential rather than parallel: each request stays far below the payload
 * cap, and a slow connection uploading several megabytes at once is the
 * situation that produced the original failure.
 *
 * A failure on one file never discards the others. The business already
 * exists by this point, so losing a photo must not invalidate the
 * registration — the caller reports which files need retrying.
 */
export async function uploadOnboardingPhotos({
  files,
  businessId,
  token,
  upload = defaultUpload,
}: UploadOnboardingPhotosInput): Promise<UploadOnboardingPhotosResult> {
  const urls: string[] = [];
  const failed: string[] = [];

  for (const file of files) {
    try {
      // Shrink before uploading: a 2MB phone photo lands around 250KB with no
      // visible loss at display size. Compression fails open, returning the
      // original, so it can never block an upload.
      const { file: payload } = await compressImage(file);
      const res = await upload({ file: payload, businessId, token });
      const url = res?.urls?.[0]?.url;
      if (url) {
        urls.push(url);
      } else {
        // The server answered but stored nothing: report the file instead of
        // inventing a URL that would render as a broken image.
        failed.push(file.name);
      }
    } catch {
      failed.push(file.name);
    }
  }

  return { urls, failed };
}
