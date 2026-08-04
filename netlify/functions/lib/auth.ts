import { createClerkClient } from '@clerk/clerk-sdk-node';
import prisma from './prisma';

/**
 * Auth helper for ConectaPeru Netlify Functions.
 *
 * Replaces the insecure pattern of trusting a raw Clerk ID sent in the
 * Authorization header. This helper:
 *   1. Extracts the Bearer token from the request.
 *   2. Cryptographically verifies it with Clerk (signature + expiry)
 *      using CLERK_SECRET_KEY.
 *   3. Returns the verified Clerk user claims (id = `sub`).
 *
 * The verified Clerk ID is then used to load the user role from PostgreSQL,
 * so authorization never trusts an unverified identifier.
 */

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY || '';

let clerkClientInstance: ReturnType<typeof createClerkClient> | null = null;

function getClerkClient() {
  if (!clerkClientInstance) {
    clerkClientInstance = createClerkClient({ secretKey: CLERK_SECRET_KEY });
  }
  return clerkClientInstance;
}

export interface AuthClaims {
  clerkId: string; // Clerk user id (JWT `sub`)
  email?: string | null;
  [key: string]: unknown;
}

/**
 * Extract the raw Bearer token from a Netlify function event.
 */
export function extractBearerToken(event: any): string {
  const authHeader =
    event?.headers?.authorization || event?.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return '';
  return authHeader.slice('Bearer '.length).trim();
}

/**
 * Verify a Clerk session token. Returns verified claims or null on failure.
 */
export async function verifyClerkToken(token: string): Promise<AuthClaims | null> {
  if (!token || !CLERK_SECRET_KEY) return null;
  try {
    const clerkClient = getClerkClient();
    const claims = await clerkClient.verifyToken(token);
    const clerkId = (claims?.sub as string) || '';
    if (!clerkId) return null;
    return {
      clerkId,
      email: (claims as any)?.email ?? null,
      ...claims,
    };
  } catch (err) {
    console.error('[auth] Clerk token verification failed:', (err as Error).message);
    return null;
  }
}

export interface AuthenticatedRequest {
  ok: boolean;
  statusCode?: number;
  clerkId?: string;
  claims?: AuthClaims | null;
  error?: string;
}

/**
 * Extract + verify the Bearer token. On success returns ok:true with clerkId.
 * On failure returns ok:false with an appropriate HTTP status + error message.
 */
export async function authenticateRequest(event: any): Promise<AuthenticatedRequest> {
  const token = extractBearerToken(event);
  if (!token) {
    return {
      ok: false,
      statusCode: 401,
      error: 'No autorizado — token requerido',
    };
  }

  const claims = await verifyClerkToken(token);
  if (!claims) {
    return {
      ok: false,
      statusCode: 401,
      error: 'No autorizado — sesión inválida o expirada',
    };
  }

  return { ok: true, clerkId: claims.clerkId, claims };
}

/**
 * Authenticate the request AND ensure the verified Clerk user has the
 * `superadmin` role in PostgreSQL.
 */
export async function requireSuperAdmin(event: any): Promise<AuthenticatedRequest> {
  const auth = await authenticateRequest(event);
  if (!auth.ok) return auth;

  const user = await prisma.user.findUnique({
    where: { clerkId: auth.clerkId! },
    select: { role: true },
  });

  if (user?.role !== 'superadmin') {
    return {
      ok: false,
      statusCode: 403,
      error: 'Acceso denegado — se requiere rol superadmin',
    };
  }

  return auth;
}

/**
 * Authenticate the request AND ensure the verified Clerk user owns the given
 * business (BusinessProfile.ownerId === user.id).
 * Returns the authenticated user's id and the owned business profile id.
 */
export async function requireBusinessOwner(
  event: any,
  businessId: string
): Promise<AuthenticatedRequest & { ownerBusinessId?: string; userId?: string }> {
  const auth = await authenticateRequest(event);
  if (!auth.ok) return auth;

  const user = await prisma.user.findUnique({
    where: { clerkId: auth.clerkId! },
    select: {
      id: true,
      business: { select: { id: true } },
    },
  });

  if (!user?.business) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Acceso denegado — el usuario no posee un negocio.',
    };
  }

  if (user.business.id !== businessId) {
    return {
      ok: false,
      statusCode: 403,
      error: 'Acceso denegado — este negocio no pertenece al usuario autenticado.',
    };
  }

  return { ...auth, ownerBusinessId: user.business.id, userId: user.id };
}

export default {
  authenticateRequest,
  requireSuperAdmin,
  requireBusinessOwner,
  verifyClerkToken,
  extractBearerToken,
};
