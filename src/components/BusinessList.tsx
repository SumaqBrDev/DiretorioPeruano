// src/components/BusinessList.tsx
import { useState, useEffect } from "react";
import axios from "axios";
import { BusinessCard } from "./BusinessCard";

export const BusinessList = () => {
  const [businesses, setBusinesses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get("/api/businesses")
      .then(res => setBusinesses(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-4">Carregando...</div>;

  return (
    <div className="space-y-4">
      {businesses.map((business) => (
        <BusinessCard key={business.id} business={business} />
      ))}
      {businesses.length === 0 && <div className="text-center p-4 text-gray-500">Nenhum negócio encontrado.</div>}
    </div>
  );
};