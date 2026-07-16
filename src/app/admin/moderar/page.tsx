// src/app/admin/moderar/page.tsx
import prisma from "@/lib/prisma";
import { ReviewModerationCard } from "@/components/ReviewModerationCard";

export default async function ModerarPage() {
  const pendingReviews = await prisma.review.findMany({
    where: { status: "pending" },
    include: { business: true, consumer: true },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-playfair text-aji-rojo mb-8">Moderar Comentários</h1>
      <div className="space-y-4">
        {pendingReviews.map((review) => (
          <ReviewModerationCard key={review.id} review={review} />
        ))}
      </div>
    </div>
  );
}