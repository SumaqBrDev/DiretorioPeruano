// src/app/admin/page.tsx
import prisma from "@/lib/prisma";
import { BusinessList } from "@/components/BusinessList";
import { StatsCard } from "@/components/StatsCard";

export default async function AdminPage() {
  const totalBusinesses = await prisma.businessProfile.count();
  const totalUsers = await prisma.user.count();
  const pendingReviews = await prisma.review.count({
    where: { status: "pending" },
  });

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-playfair text-aji-rojo mb-8">Painel do Administrador</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StatsCard title="Total de Negócios" value={totalBusinesses} />
        <StatsCard title="Total de Usuários" value={totalUsers} />
        <StatsCard title="Comentários Pendentes" value={pendingReviews} />
      </div>
      <BusinessList />
    </div>
  );
}