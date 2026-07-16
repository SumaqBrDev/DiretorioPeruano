// src/components/StatsCard.tsx
interface StatsCardProps {
  title: string;
  value: number;
}

export const StatsCard = ({ title, value }: StatsCardProps) => {
  return (
    <div className="bg-creme-andino p-6 rounded-xl shadow-sm">
      <h3 className="text-lg font-medium text-gray-600">{title}</h3>
      <p className="text-3xl font-bold text-aji-rojo mt-2">{value}</p>
    </div>
  );
};