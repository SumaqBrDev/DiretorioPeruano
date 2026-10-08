import prisma from './prisma';

export type OwnedBusinessResult<T = any> =
  | { ok: true; business: T }
  | { ok: false; statusCode: 403 | 404; error: string };

export async function resolveOwnedBusiness(
  userId: string,
  businessId?: string | null,
  options: { includeAds?: boolean } = {}
): Promise<OwnedBusinessResult> {
  const include = options.includeAds
    ? {
        ads: {
          orderBy: { createdAt: 'desc' as const },
          select: {
            id: true,
            title: true,
            imageUrl: true,
            targetUrl: true,
            status: true,
            stripePaymentId: true,
            moderationReason: true,
            reviewAttempts: true,
            refundedAt: true,
            startsAt: true,
            endsAt: true,
            createdAt: true,
          },
        },
      }
    : undefined;

  const business = await prisma.businessProfile.findFirst({
    where: businessId ? { id: businessId, ownerId: userId } : { ownerId: userId },
    ...(include ? { include } : {}),
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
  } as any);

  if (!business) {
    return {
      ok: false,
      statusCode: businessId ? 403 : 404,
      error: businessId
        ? 'Acceso denegado — este negocio no pertenece al usuario autenticado.'
        : 'El usuario no posee un negocio',
    };
  }

  return { ok: true, business };
}

export async function listOwnedBusinesses(userId: string) {
  return prisma.businessProfile.findMany({
    where: { ownerId: userId },
    orderBy: [{ status: 'asc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      name: true,
      category: true,
      status: true,
      subscriptionStatus: true,
      rejectionReason: true,
      approvedAt: true,
      trialEndsAt: true,
      createdAt: true,
      cnpj: true,
      ownerFullName: true,
      ownerBirthCity: true,
      address: true,
      description: true,
      tags: true,
      photos: true,
      contact: true,
    },
  });
}
