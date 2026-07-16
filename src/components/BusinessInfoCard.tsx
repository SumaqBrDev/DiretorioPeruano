import { Business } from '@/data/mockBusinesses';
import { StarRating } from './StarRating';

interface BusinessInfoCardProps {
  business: Business;
}

export const BusinessInfoCard = ({ business }: BusinessInfoCardProps) => {
  return (
    <section className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20 mb-8">
      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="font-playfair text-3xl font-bold text-noche-lima dark:text-white">{business.name}</h1>
            <span className="bg-aji-rojo/10 text-aji-rojo px-3 py-1 rounded-full text-sm font-medium">{business.category}</span>
          </div>
          <div className="flex items-center gap-2 mb-4">
            <StarRating rating={business.rating} size="lg" />
            <span className="text-gray-600 dark:text-gray-400">({business.reviewsCount} avaliações)</span>
          </div>
          <p className="text-gray-700 dark:text-gray-300 mb-4">{business.tags.join(' • ')}</p>
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <span>📍</span>
            <span>{business.city}</span>
          </div>
        </div>
      </div>
    </section>
  );
};
