import { Business } from '@/data/mockBusinesses';
import { StarRating } from './StarRating';

interface ReviewsSectionProps {
  business: Business;
}

export const ReviewsSection = ({ business }: ReviewsSectionProps) => {
  const averageRating = business.reviews.length > 0 
    ? business.reviews.reduce((sum, r) => sum + r.rating, 0) / business.reviews.length 
    : business.rating;

  return (
    <section className="mb-12">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white">Avaliações</h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <StarRating rating={averageRating} size="md" />
              </div>
              <span className="font-bold text-xl text-noche-lima dark:text-white">{averageRating.toFixed(1)}</span>
              <span className="text-gray-600 dark:text-gray-400">({business.reviews.length} avaliações)</span>
            </div>
          </div>
        </header>

        <div className="space-y-6">
          {business.reviews.length > 0 ? (
            business.reviews.map((review) => (
              <article key={review.id} className="bg-creme-andino dark:bg-noche-lima rounded-xl p-6 border border-oro-inca/20">
                <header className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aji-rojo to-oro-inca flex items-center justify-center text-white font-bold">
                      {review.author.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-noche-lima dark:text-white">{review.author}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">{review.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarRating rating={review.rating} size="md" />
                  </div>
                </header>
                <p className="text-gray-700 dark:text-gray-300 mb-4 italic">"{review.text}"</p>
                <div className="flex items-center gap-2">
                  {review.tags.map((tag, i) => (
                    <span key={i} className="bg-aji-rojo/10 text-aji-rojo px-2 py-1 rounded-full text-xs font-medium">#{tag}</span>
                  ))}
                </div>
              </article>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">Nenhuma avaliação ainda. Seja o primeiro a avaliar!</p>
          )}
        </div>
      </div>
    </section>
  );
};
