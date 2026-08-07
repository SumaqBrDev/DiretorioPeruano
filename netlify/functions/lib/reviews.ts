// netlify/functions/lib/reviews.ts
// Pure helpers for the reviews endpoint. No DB/network imports — unit-testable.
import type { Prisma } from '@prisma/client';

export interface ReviewInput {
  rating?: unknown;
  comment?: unknown;
  businessId?: unknown;
  [key: string]: unknown;
}

/**
 * Validate a review submission body. Returns an error message or null.
 * `consumerId` is intentionally NOT required: it is derived server-side
 * from the authenticated Clerk session.
 */
export function validateReviewInput(body: ReviewInput): string | null {
  const { rating, comment, businessId } = body;
  if (!comment || !comment.trim() || !businessId) {
    return 'Campos obrigatórios: rating, comment, businessId';
  }
  if (typeof rating !== 'number' || rating < 1 || rating > 5) {
    return 'Rating deve ser entre 1 e 5';
  }
  return null;
}

/**
 * Build the Prisma create data for a review. The `consumerId` comes from the
 * verified authenticated user — any client-supplied consumerId is ignored.
 * Reviews are auto-approved (status: 'approved').
 */
export function buildReviewCreateData(
  body: ReviewInput,
  consumerId: string
): Prisma.ReviewUncheckedCreateInput {
  return {
    rating: body.rating as number,
    comment: body.comment as string,
    status: 'approved',
    businessId: body.businessId as string,
    consumerId,
  };
}
