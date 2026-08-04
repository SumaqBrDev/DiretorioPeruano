// CNPJ validation utility for ConectaPeru.
// - Format: 14 digits
// - Check digits: Mod 11 (per Brazilian Receita Federal algorithm)
// - Optional lookup against the free public API publica.cnpj.ws (no auth), with
//   a simple in-memory cache (24h) + fallback to format-only validation.
//
// Endpoints that need CNPJ validation should import this module.

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

interface CachedLookup {
  expiresAt: number;
  data: { valid: boolean; companyName?: string; error?: string } | null;
}

const cache = new Map<string, CachedLookup>();

function onlyDigits(value: string): string {
  return (value || '').replace(/\D/g, '');
}

/**
 * Validate check digits (Mod 11). Assumes `digits` is a 14-digit numeric string.
 */
export function isValidCnpjDigits(digits: string): boolean {
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false; // all same digit

  const calc = (base: string): number => {
    const weights = base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let sum = 0;
    for (let i = 0; i < base.length; i++) sum += parseInt(base[i], 10) * weights[i];
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const d1 = calc(digits.slice(0, 12));
  const d2 = calc(digits.slice(0, 13));
  return d1 === parseInt(digits[12], 10) && d2 === parseInt(digits[13], 10);
}

/**
 * Format validation (structure only, no external call).
 */
export function isValidCnpjFormat(value: string): boolean {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return false;
  return isValidCnpjDigits(digits);
}

/**
 * Lookup company data via publica.cnpj.ws (free, no auth). Returns null on
 * network/API failure so callers can fall back to format-only validation.
 */
export async function lookupCnpj(
  cnpj: string
): Promise<{ valid: boolean; companyName?: string; error?: string } | null> {
  const digits = onlyDigits(cnpj);
  if (digits.length !== 14) return null;

  const cached = cache.get(digits);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  try {
    const res = await fetch(`https://publica.cnpj.ws/cnpj/${digits}`, {
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });

    if (res.status === 404) {
      const out = { valid: false, error: 'CNPJ não encontrado na Receita Federal' };
      cache.set(digits, { expiresAt: Date.now() + CACHE_TTL_MS, data: out });
      return out;
    }
    if (!res.ok) {
      // Non-blocking failure -> fall back to format-only validation
      return null;
    }

    const data = await res.json();
    const out = { valid: true, companyName: data?.razao_social || data?.nome_fantasia || undefined };
    cache.set(digits, { expiresAt: Date.now() + CACHE_TTL_MS, data: out });
    return out;
  } catch (err) {
    console.error('[cnpj] lookup failed, falling back to format validation:', (err as Error).message);
    return null;
  }
}

/**
 * Full validation: format + check digits, then optional online lookup.
 * Always returns a boolean-safe result; online failures degrade gracefully.
 */
export async function validateCnpj(cnpj: string): Promise<{
  valid: boolean;
  formatValid: boolean;
  companyName?: string;
  note?: string;
}> {
  const formatValid = isValidCnpjFormat(cnpj);
  if (!formatValid) {
    return { valid: false, formatValid: false, note: 'Formato ou dígitos verificadores inválidos' };
  }

  const lookup = await lookupCnpj(cnpj);
  if (lookup === null) {
    // Online lookup unavailable -> trust format validation
    return { valid: true, formatValid: true, note: 'Validado por formato (API indisponível)' };
  }
  if (lookup.valid) {
    return { valid: true, formatValid: true, companyName: lookup.companyName };
  }
  return { valid: false, formatValid: true, note: lookup.error || 'CNPJ não encontrado online' };
}

export default { isValidCnpjFormat, isValidCnpjDigits, lookupCnpj, validateCnpj };
