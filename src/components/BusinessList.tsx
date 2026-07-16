// src/components/BusinessList.tsx
import prisma from "@/lib/prisma";
import { BusinessCard } from "@/components/BusinessCard";

export const BusinessList = async () => {
  const businesses = await prisma.businessProfile.findMany({
    include: { owner: true },
  });

  return (
    <div className="space-y-4">
      {businesses.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
    </div>
  );
};