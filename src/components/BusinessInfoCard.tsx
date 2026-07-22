import { MapPin } from '@phosphor-icons/react';
import { Business } from '../data/mockBusinesses';
import { StarRating } from './StarRating';

interface BusinessInfoCardProps {
  business: Business;
}

export const BusinessInfoCard = ({ business }: BusinessInfoCardProps) => {
  return (
    <section className="bg-white dark:bg-noche-lima/95 rounded-xl shadow-sm ring-1 ring-black/5 dark:ring-white/10 p-6 md:p-8 mb-8">
      <div className="flex flex-col md:flex-row items-start gap-5">
        <div className="flex-1 min-w-0">
          {/* Name + Category */}
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <h1 className="text-2xl md:text-3xl font-bold text-noche-lima dark:text-white truncate max-w-[85%]">
              {business.name}
            </h1>
            <span className="shrink-0 inline-flex items-center gap-1.5 bg-oro-inca/10 dark:bg-oro-inca/15 text-oro-inca dark:text-oro-inca px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] ring-1 ring-oro-inca/20 dark:ring-oro-inca/25">
              <span className="w-1 h-1 rounded-full bg-oro-inca" />
              {business.category}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center gap-2 mb-4">
            <StarRating rating={business.rating} size="lg" />
            <span className="text-sm text-gray-400 dark:text-gray-500">
              <span className="font-semibold text-gray-600 dark:text-gray-400">{business.rating}</span>
              {' '}({business.reviewsCount} {business.reviewsCount === 1 ? 'avaliação' : 'avaliações'})
            </span>
          </div>

          {/* Tags */}
          {business.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {business.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 ring-1 ring-gray-200 dark:ring-white/10"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Location */}
          <div className="flex items-center gap-1.5 text-sm text-gray-400 dark:text-gray-500">
            <MapPin size={14} weight="fill" className="shrink-0 text-aji-rojo/50" />
            <span className="text-gray-500 dark:text-gray-400">
              {business.city}
              {business.address ? <span className="text-gray-400 dark:text-gray-500"> — {business.address}</span> : ''}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
