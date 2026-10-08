// tests/onboarding-photo-upload.test.ts
// Registration used to inline every photo as a base64 data URL inside the
// JSON body of POST /api/businesses. Netlify Functions cap a buffered request
// at 6MB, and base64 inflates bytes by ~33%, so three ordinary phone photos
// were enough to blow the cap and return 413 before the business was created.
//
// The business is now created WITHOUT photos, then each file is uploaded as
// multipart to /api/upload-image, and the resulting URLs are persisted.
import { describe, it, expect, vi } from 'vitest';
import { uploadOnboardingPhotos, estimateBase64PayloadBytes, FUNCTION_PAYLOAD_LIMIT_BYTES } from '../src/lib/onboardingPhotos';

function fakeFile(name: string, bytes: number): File {
  return new File([new Uint8Array(bytes)], name, { type: 'image/jpeg' });
}

describe('base64 payload estimation', () => {
  // The exact arithmetic that caused the 413: 3 bytes encode as 4 characters.
  it('reports the ~33% inflation that base64 adds', () => {
    const raw = 3 * 1024 * 1024; // 3MB of real image bytes
    const encoded = estimateBase64PayloadBytes(raw);
    expect(encoded).toBeGreaterThan(raw * 1.3);
    expect(encoded).toBeLessThan(raw * 1.4);
  });

  it('shows that 3 typical photos exceed the 6MB function cap when inlined', () => {
    // 2MB each is an ordinary modern phone photo, not an edge case.
    // 4.5MB of raw bytes encodes to EXACTLY 6MB, so the cap is already reached
    // at 4.5MB of images — before counting the JSON wrapper and the rest of
    // the registration form.
    const raw = 3 * 2 * 1024 * 1024;
    expect(estimateBase64PayloadBytes(raw)).toBeGreaterThan(FUNCTION_PAYLOAD_LIMIT_BYTES);
  });

  it('reaches the cap at just 4.5MB of raw images, before any JSON overhead', () => {
    const raw = 4.5 * 1024 * 1024;
    expect(estimateBase64PayloadBytes(raw)).toBe(FUNCTION_PAYLOAD_LIMIT_BYTES);
  });
});

describe('uploadOnboardingPhotos', () => {
  it('uploads every file and returns the stored URLs in order', async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce({ urls: [{ url: '/api/blob-asset?key=a', key: 'a' }] })
      .mockResolvedValueOnce({ urls: [{ url: '/api/blob-asset?key=b', key: 'b' }] });

    const res = await uploadOnboardingPhotos({
      files: [fakeFile('a.jpg', 10), fakeFile('b.jpg', 10)],
      businessId: 'biz-1',
      token: 't',
      upload,
    });

    expect(upload).toHaveBeenCalledTimes(2);
    expect(res.urls).toEqual(['/api/blob-asset?key=a', '/api/blob-asset?key=b']);
    expect(res.failed).toEqual([]);
  });

  // The business already exists at this point. Losing one photo must not
  // discard the others or invalidate the registration.
  it('keeps the successful uploads when one file fails', async () => {
    const upload = vi
      .fn()
      .mockResolvedValueOnce({ urls: [{ url: '/ok', key: 'a' }] })
      .mockRejectedValueOnce(new Error('network died'));

    const res = await uploadOnboardingPhotos({
      files: [fakeFile('a.jpg', 10), fakeFile('b.jpg', 10)],
      businessId: 'biz-1',
      token: 't',
      upload,
    });

    expect(res.urls).toEqual(['/ok']);
    expect(res.failed).toEqual(['b.jpg']);
  });

  it('reports a file the server rejected, without inventing a URL', async () => {
    const upload = vi.fn().mockResolvedValueOnce({ urls: [], errors: [{ filename: 'big.jpg', error: 'too large' }] });

    const res = await uploadOnboardingPhotos({
      files: [fakeFile('big.jpg', 10)],
      businessId: 'biz-1',
      token: 't',
      upload,
    });

    expect(res.urls).toEqual([]);
    expect(res.failed).toEqual(['big.jpg']);
  });

  it('does nothing and calls no endpoint when there are no photos', async () => {
    const upload = vi.fn();

    const res = await uploadOnboardingPhotos({
      files: [],
      businessId: 'biz-1',
      token: 't',
      upload,
    });

    expect(upload).not.toHaveBeenCalled();
    expect(res.urls).toEqual([]);
  });

  // Uploading one at a time keeps every request far below the 6MB cap, which
  // is the whole point of the change.
  it('sends one request per file rather than one batched request', async () => {
    const upload = vi.fn().mockResolvedValue({ urls: [{ url: '/x', key: 'x' }] });

    await uploadOnboardingPhotos({
      files: [fakeFile('a.jpg', 10), fakeFile('b.jpg', 10), fakeFile('c.jpg', 10)],
      businessId: 'biz-1',
      token: 't',
      upload,
    });

    expect(upload).toHaveBeenCalledTimes(3);
  });
});
