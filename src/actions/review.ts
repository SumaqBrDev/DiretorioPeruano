// src/actions/review.ts
"use server";

import prisma from "@/lib/prisma";

export async function approveReview(reviewId: string) {
  const review = await prisma.review.update({
    where: { id: reviewId },
    data: { status: "approved" },
    include: { business: { include: { owner: true } } },
  });

  // TODO: Implementar notificación por email cuando Clerk esté configurado
  console.log(`Notificar al negocio ${review.business.owner.email}: Comentario aprobado`);

  return review;
}

export async function rejectReview(reviewId: string) {
  await prisma.review.update({
    where: { id: reviewId },
    data: { status: "rejected" },
  });
}