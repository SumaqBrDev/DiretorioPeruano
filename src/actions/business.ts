// src/actions/business.ts
"use server";

import prisma from "@/lib/prisma";

export async function updateBusinessStatus(businessId: string, status: string) {
  const business = await prisma.businessProfile.update({
    where: { id: businessId },
    data: { status },
    include: { owner: true },
  });

  // TODO: Implementar notificación por email cuando Clerk esté configurado
  console.log(`Notificar al dueño ${business.owner.email}: Negócio ${status}`);

  return business;
}