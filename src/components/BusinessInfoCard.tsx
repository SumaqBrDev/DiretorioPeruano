import { MapPin } from '@phosphor-icons/react';
import { Business } from '../data/mockBusinesses';
import { StarRating } from './StarRating';

interface BusinessInfoCardProps {
  business: Business;
}

export const BusinessInfoCard = ({ business }: BusinessInfoCardProps) => {
  return (
    <section className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/10 mb-8">
      <div className="flex flex-col md:flex-row items-start gap-6">
        <div className="flex-1 min-w-0">
          {/* Name + Category */}
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl md:text-3xl font-bold text-noche-lima dark:text-white truncate">
              {business.name}
            </h1>
            <span className="shrink-0 bg-aji-rojo/10 text-aji-rojo px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider">
              {business.category}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <StarRating rating={business.rating} size="lg" />
            <span className="text-gray-500 dark:text-gray-400 text-sm">
              {business.rating} ({business.reviewsCount} avaliações)
            </span>
          </div>

          {/* Tags */}
          {business.tags.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {business.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-3 py-0.5 rounded-full text-xs font-medium bg-oro-inca/10 text-oro-inca dark:text-oro-inca/90"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
            <MapPin size={14} weight="fill" className="shrink-0 text-aji-rojo/60" />
            <span>
              {business.city}
              {business.address ? ` — ${business.address}` : ''}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
