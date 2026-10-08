// tests/business-contact-fields.test.ts
import { describe, it, expect } from 'vitest';
import {
  isGoogleMapsUrl,
  validateContactFields,
  normalizeWhatsApp,
  buildMapsUrl,
} from '../src/lib/businessContact';
import { fitWithin, toWebpFilename, compressImage } from '../src/lib/imageCompression';

describe('isGoogleMapsUrl', () => {
  // The formats Google itself documents as valid Maps URLs.
  it.each([
    'https://www.google.com/maps/place/Cantina+Don+Jose',
    'https://google.com/maps/search/?api=1&query=Sao+Paulo',
    'https://maps.google.com/?cid=3545450935484072529',
    'https://maps.google.com.br/maps?q=Rua+Augusta',
    'https://www.google.com.br/maps/place/Mercado',
    'https://goo.gl/maps/abc123',
    'https://maps.app.goo.gl/XyZ987',
  ])('accepts %s', (url) => {
    expect(isGoogleMapsUrl(url).valid).toBe(true);
  });

  // A link that is not Maps at all.
  it.each([
    'https://www.waze.com/ul?ll=-23.5,-46.6',
    'https://www.google.com/search?q=cantina',
    'https://openstreetmap.org/#map=16/-23.5/-46.6',
    'https://bing.com/maps',
  ])('rejects non-Maps link %s', (url) => {
    expect(isGoogleMapsUrl(url).valid).toBe(false);
  });

  // Look-alike hosts: the dangerous case. A naive `url.includes('google.com')`
  // check would accept every one of these and send users to an attacker.
  it.each([
    'https://google.com.evil.net/maps',
    'https://notgoogle.com/maps',
    'https://maps.google.com.attacker.io/?q=x',
    'https://evil.net/https://google.com/maps',
    'https://googlecom/maps',
  ])('rejects look-alike host %s', (url) => {
    expect(isGoogleMapsUrl(url).valid).toBe(false);
  });

  it('rejects a non-https link so we never downgrade the user', () => {
    expect(isGoogleMapsUrl('http://www.google.com/maps/place/X').valid).toBe(false);
  });

  it('rejects javascript: and data: payloads', () => {
    expect(isGoogleMapsUrl('javascript:alert(1)').valid).toBe(false);
    expect(isGoogleMapsUrl('data:text/html,<script>').valid).toBe(false);
  });

  it('treats an empty value as valid because the field is optional', () => {
    expect(isGoogleMapsUrl('').valid).toBe(true);
    expect(isGoogleMapsUrl('   ').valid).toBe(true);
  });

  it('explains WHY it rejected, so the message can be shown to the user', () => {
    const res = isGoogleMapsUrl('https://www.waze.com/ul');
    expect(res.valid).toBe(false);
    expect(res.reason).toBeTruthy();
  });
});

describe('normalizeWhatsApp', () => {
  it('strips formatting so wa.me receives digits only', () => {
    expect(normalizeWhatsApp('+55 (11) 98765-4321')).toBe('5511987654321');
  });

  it('assumes Brazil when the country code is missing', () => {
    // 11 digits = Brazilian mobile with area code but no country code.
    expect(normalizeWhatsApp('(11) 98765-4321')).toBe('5511987654321');
  });

  it('keeps an explicit foreign country code untouched', () => {
    expect(normalizeWhatsApp('+51 987 654 321')).toBe('51987654321');
  });

  it('returns empty for empty input', () => {
    expect(normalizeWhatsApp('')).toBe('');
  });
});

describe('validateContactFields', () => {
  it('passes when every field is empty (all optional)', () => {
    expect(validateContactFields({})).toEqual({});
  });

  it('flags an invalid maps link by field name', () => {
    const errors = validateContactFields({ mapsUrl: 'https://waze.com/x' });
    expect(errors.mapsUrl).toBeTruthy();
  });

  it('flags a phone that is too short to dial', () => {
    expect(validateContactFields({ phone: '123' }).phone).toBeTruthy();
  });

  it('flags a malformed email', () => {
    expect(validateContactFields({ email: 'not-an-email' }).email).toBeTruthy();
  });

  it('accepts a website without a scheme and does not flag it', () => {
    expect(validateContactFields({ website: 'cantinadonjose.com.br' }).website).toBeUndefined();
  });

  it('accepts a fully valid set', () => {
    expect(
      validateContactFields({
        phone: '+55 11 98765-4321',
        whatsapp: '+55 11 98765-4321',
        email: 'contato@cantina.com.br',
        website: 'https://cantina.com.br',
        mapsUrl: 'https://maps.app.goo.gl/abc',
      }),
    ).toEqual({});
  });
});

describe('buildMapsUrl', () => {
  it('prefers the owner-provided link over a generated search', () => {
    const url = buildMapsUrl({ mapsUrl: 'https://maps.app.goo.gl/abc', address: 'Rua X, 123' });
    expect(url).toBe('https://maps.app.goo.gl/abc');
  });

  it('falls back to an address search when no link was given', () => {
    const url = buildMapsUrl({ address: 'Rua Augusta, 100' });
    expect(url).toContain('google.com/maps/search/');
    expect(url).toContain(encodeURIComponent('Rua Augusta, 100'));
  });

  it('returns empty when there is neither link nor address', () => {
    expect(buildMapsUrl({})).toBe('');
  });

  // A stored link that fails validation must never be rendered.
  it('ignores a stored link that is not a Google Maps URL', () => {
    const url = buildMapsUrl({ mapsUrl: 'https://evil.net/x', address: 'Rua X' });
    expect(url).toContain('google.com/maps/search/');
  });
});

describe('image compression (not SVG)', () => {
  it('scales the longest edge down and preserves aspect ratio', () => {
    expect(fitWithin(4000, 3000, 1600)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000, 1600)).toEqual({ width: 1200, height: 1600 });
  });

  it('never upscales an image that is already small', () => {
    expect(fitWithin(800, 600, 1600)).toEqual({ width: 800, height: 600 });
  });

  it('renames the file to match its real encoding', () => {
    expect(toWebpFilename('fachada.jpg')).toBe('fachada.webp');
    expect(toWebpFilename('foto.final.PNG')).toBe('foto.final.webp');
  });

  it('keeps the original when the encoder fails, so upload still works', async () => {
    const file = new File([new Uint8Array(1000)], 'a.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file, async () => {
      throw new Error('no webp support');
    });
    expect(res.wasCompressed).toBe(false);
    expect(res.file).toBe(file);
  });

  it('keeps the original when re-encoding would make it bigger', async () => {
    const file = new File([new Uint8Array(1000)], 'a.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file, async () => ({
      blob: new Blob([new Uint8Array(5000)]),
      width: 10,
      height: 10,
    }));
    expect(res.wasCompressed).toBe(false);
    expect(res.compressedBytes).toBe(1000);
  });

  it('uses the compressed file when it is genuinely smaller', async () => {
    const file = new File([new Uint8Array(100000)], 'a.jpg', { type: 'image/jpeg' });
    const res = await compressImage(file, async () => ({
      blob: new Blob([new Uint8Array(12000)]),
      width: 1600,
      height: 1200,
    }));
    expect(res.wasCompressed).toBe(true);
    expect(res.file.name).toBe('a.webp');
    expect(res.compressedBytes).toBe(12000);
  });

  it('passes an SVG through untouched: it is already vector, not pixels', async () => {
    const file = new File(['<svg/>'], 'logo.svg', { type: 'image/svg+xml' });
    const res = await compressImage(file);
    expect(res.wasCompressed).toBe(false);
    expect(res.file).toBe(file);
  });
});
