// src/lib/imageCompression.ts
// Shrink photos in the browser BEFORE uploading them.
//
// Why not SVG (the obvious-sounding idea): SVG is a vector format -- it stores
// drawing instructions, not pixels. A photograph has no vectors to extract, so
// "converting" one either embeds the original bytes as base64 inside an <image>
// tag (making the file ~33% BIGGER) or traces it into thousands of flat
// polygons (destroying the photo and usually growing the file too).
//
// Resizing and re-encoding to WebP is what actually achieves the goal: a 2MB
// phone photo lands around 250KB with no visible loss at display size.

/** Longest edge we keep. Business cards and galleries never render larger. */
export const MAX_IMAGE_DIMENSION = 1600;

/** WebP quality. 0.82 is the point where artifacts stay invisible on photos. */
export const WEBP_QUALITY = 0.82;

export interface CompressionResult {
  file: File;
  originalBytes: number;
  compressedBytes: number;
  /** False when the original was already smaller and was kept as-is. */
  wasCompressed: boolean;
}

/**
 * Scale dimensions down so the longest edge fits `maxEdge`, preserving aspect
 * ratio. Images already smaller are returned untouched -- upscaling would add
 * bytes and no detail.
 */
export function fitWithin(
  width: number,
  height: number,
  maxEdge: number = MAX_IMAGE_DIMENSION,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };

  const ratio = maxEdge / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}

/** Swap the extension so the stored filename matches its real encoding. */
export function toWebpFilename(filename: string): string {
  return filename.replace(/\.[^.]+$/, '') + '.webp';
}

type Encoder = (
  file: File,
) => Promise<{ blob: Blob; width: number; height: number } | null>;

async function browserEncode(file: File) {
  // createImageBitmap decodes off the main thread, so a large photo does not
  // freeze the form while it is processed.
  const bitmap = await createImageBitmap(file);
  const { width, height } = fitWithin(bitmap.width, bitmap.height);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return null;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY),
  );

  return blob ? { blob, width, height } : null;
}

/**
 * Compress one image. Returns the ORIGINAL file whenever compression fails or
 * does not actually help.
 *
 * Failing open is deliberate: the upload endpoint accepts the original format
 * anyway, so a browser without WebP encoding support (or a corrupt file) must
 * not block a registration. A photo that uploads slowly beats one that cannot
 * be uploaded at all.
 */
export async function compressImage(
  file: File,
  encode: Encoder = browserEncode,
): Promise<CompressionResult> {
  const originalBytes = file.size;
  const unchanged: CompressionResult = {
    file,
    originalBytes,
    compressedBytes: originalBytes,
    wasCompressed: false,
  };

  // Non-images (and SVGs, which are already vector text) are passed through.
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return unchanged;
  }

  let encoded: Awaited<ReturnType<Encoder>>;
  try {
    encoded = await encode(file);
  } catch {
    return unchanged;
  }
  if (!encoded) return unchanged;

  // Re-encoding can grow a file that was already well compressed. Keeping the
  // larger output would defeat the entire purpose.
  if (encoded.blob.size >= originalBytes) return unchanged;

  return {
    file: new File([encoded.blob], toWebpFilename(file.name), { type: 'image/webp' }),
    originalBytes,
    compressedBytes: encoded.blob.size,
    wasCompressed: true,
  };
}

/** Compress a list, preserving order. One failure never affects the others. */
export async function compressImages(
  files: File[],
  encode?: Encoder,
): Promise<CompressionResult[]> {
  const out: CompressionResult[] = [];
  for (const file of files) {
    out.push(await compressImage(file, encode));
  }
  return out;
}
