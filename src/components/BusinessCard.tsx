// src/components/BusinessCard.tsx
"use client";

import { updateBusinessStatus } from "@/actions/business";

interface BusinessCardProps {
  business: {
    id: string;
    name: string;
    owner: { name: string | null };
    status: string;
  };
}

export const BusinessCard = ({ business }: BusinessCardProps) => {
  return (
    <div className="bg-creme-andino p-6 rounded-xl shadow-sm">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold">{business.name}</h3>
          <p className="text-gray-600">{business.owner.name || "Sin nombre"}</p>
          <p className="text-sm text-gray-500 capitalize">{business.status}</p>
        </div>
        <div className="flex gap-2">
          {business.status === "pending" && (
            <>
              <button
                onClick={() => updateBusinessStatus(business.id, "active")}
                className="bg-verde-brasil text-white px-4 py-2 rounded-lg"
              >
                Aprovar
              </button>
              <button
                onClick={() => updateBusinessStatus(business.id, "inactive")}
                className="bg-aji-rojo text-white px-4 py-2 rounded-lg"
              >
                Rejeitar
              </button>
            </>
          )}
          {business.status === "active" && (
            <button
              onClick={() => updateBusinessStatus(business.id, "inactive")}
              className="bg-gray-400 text-white px-4 py-2 rounded-lg"
            >
              Inativar
            </button>
          )}
        </div>
      </div>
    </div>
  );
};