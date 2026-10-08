// src/lib/businessContact.ts
// Contact details for a business: phone, WhatsApp, email, website and a
// Google Maps link.
//
// The public sidebar already renders TELEFONE / WHATSAPP / COMO CHEGAR rows,
// and the API already persists a `contact` JSON column, but no form ever
// collected these values -- so the rows had nothing to show. This module is
// the shared validation used by both the registration form and the edit form.

export interface ContactFields {
  phone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  /** Owner-provided Google Maps link, e.g. the "Share" link from the app. */
  mapsUrl?: string;
}

export type ContactErrors = Partial<Record<keyof ContactFields, string>>;

export interface UrlCheck {
  valid: boolean;
  reason?: string;
}

/**
 * Hosts Google itself documents for Maps links, plus the modern share domain
 * `maps.app.goo.gl`.
 *
 * Matched against the PARSED hostname, never against the raw string: a
 * substring check like `url.includes('google.com')` happily accepts
 * `https://google.com.evil.net/maps` and sends the user to an attacker.
 */
function isGoogleMapsHost(hostname: string): boolean {
  const host = hostname.toLowerCase();

  // Short share links.
  if (host === 'goo.gl' || host === 'maps.app.goo.gl') return true;

  // maps.google.<tld> — including country domains such as maps.google.com.br
  if (/^maps\.google\.[a-z.]{2,8}$/.test(host)) return true;

  // google.<tld> and www.google.<tld>
  if (/^(www\.)?google\.[a-z.]{2,8}$/.test(host)) return true;

  return false;
}

/**
 * Validate a Google Maps link.
 *
 * An empty value is VALID: the field is optional and the sidebar falls back to
 * an address search. Rejecting empty would force owners to paste a link they
 * may not have.
 */
export function isGoogleMapsUrl(value: string): UrlCheck {
  const raw = (value || '').trim();
  if (!raw) return { valid: true };

  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    return { valid: false, reason: 'Link inválido. Cole o link completo do Google Maps.' };
  }

  // https only: a http link would downgrade the connection, and
  // javascript:/data: URLs are script injection vectors.
  if (parsed.protocol !== 'https:') {
    return { valid: false, reason: 'O link deve começar com https://' };
  }

  if (!isGoogleMapsHost(parsed.hostname)) {
    return {
      valid: false,
      reason: 'O link precisa ser do Google Maps (google.com/maps, maps.app.goo.gl ou goo.gl/maps).',
    };
  }

  // A google.com host is not enough: /search is not a map.
  const path = parsed.pathname.toLowerCase();
  const host = parsed.hostname.toLowerCase();
  const looksLikeMaps =
    path.startsWith('/maps') ||
    host.startsWith('maps.') ||
    host === 'maps.app.goo.gl' ||
    (host === 'goo.gl' && path.startsWith('/maps'));

  if (!looksLikeMaps) {
    return { valid: false, reason: 'Esse link do Google não é um link de mapa.' };
  }

  return { valid: true };
}

/**
 * Reduce a phone number to the digits wa.me expects.
 *
 * A leading "+" means the owner wrote an explicit international number, so it
 * is kept as-is. This matters here: a Peruvian number like +51 987 654 321 has
 * eleven digits, exactly like a Brazilian mobile with area code, so length
 * alone cannot tell them apart. In a directory for Peruvians in Brazil,
 * guessing wrong would rewrite a Peruvian number into a broken Brazilian one.
 *
 * Without the "+", a 10- or 11-digit number is treated as Brazilian typed
 * without the country code -- the most common way owners write their phone.
 */
export function normalizeWhatsApp(value: string): string {
  const raw = (value || '').trim();
  const digits = raw.replace(/\D/g, '');
  if (!digits) return '';

  // Explicit international format: trust what the owner typed.
  if (raw.startsWith('+')) return digits;

  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return digits;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateContactFields(fields: ContactFields): ContactErrors {
  const errors: ContactErrors = {};

  const phoneDigits = (fields.phone || '').replace(/\D/g, '');
  if (phoneDigits && phoneDigits.length < 10) {
    errors.phone = 'Telefone incompleto. Inclua o DDD.';
  }

  const waDigits = (fields.whatsapp || '').replace(/\D/g, '');
  if (waDigits && waDigits.length < 10) {
    errors.whatsapp = 'WhatsApp incompleto. Inclua o DDD.';
  }

  const email = (fields.email || '').trim();
  if (email && !EMAIL_RE.test(email)) {
    errors.email = 'E-mail inválido.';
  }

  // The website is stored as typed; a missing scheme is normalised at render
  // time rather than rejected, since owners rarely type "https://".
  const website = (fields.website || '').trim();
  if (website && /\s/.test(website)) {
    errors.website = 'Endereço do site inválido.';
  }

  const maps = isGoogleMapsUrl(fields.mapsUrl || '');
  if (!maps.valid) {
    errors.mapsUrl = maps.reason;
  }

  return errors;
}

/**
 * Resolve the URL behind the "Como chegar" button.
 *
 * The owner's own link wins: it points at their verified listing, which is
 * more accurate than a text search. A stored link that no longer validates is
 * ignored rather than rendered -- data already in the database must not bypass
 * the check that new input goes through.
 */
export function buildMapsUrl({ mapsUrl, address }: { mapsUrl?: string; address?: string }): string {
  const link = (mapsUrl || '').trim();
  if (link && isGoogleMapsUrl(link).valid) return link;

  const addr = (address || '').trim();
  if (!addr) return '';

  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr)}`;
}
