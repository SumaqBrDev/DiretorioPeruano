// src/components/ReviewsSection.tsx
// Business reviews section with form to leave reviews, localStorage persistence, and API integration

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/clerk-react';
import type { DisplayBusiness } from '@/lib/localData';
import { StarRating } from './StarRating';
import { InteractiveStarRating } from './InteractiveStarRating';
import { getReviews, saveReview } from '@/lib/localData';

interface ReviewsSectionProps {
  business: DisplayBusiness;
  localBusinessId?: string;
}

interface ReviewDisplay {
  id: string | number;
  author: string;
  rating: number;
  date: string;
  text: string;
  tags: string[];
  isLocal: boolean;
}

export const ReviewsSection = ({ business }: ReviewsSectionProps) => {
  const { user, isLoaded } = useUser();

  // Form state
  const [userRating, setUserRating] = useState(0);
  const [userComment, setUserComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ rating?: string; comment?: string }>({});
  const [successMessage, setSuccessMessage] = useState('');

  // Reviews state
  const [localReviews, setLocalReviews] = useState<ReviewDisplay[]>([]);

  const businessId = String(business.id);
  const localId = business.localId;
  const userId = user?.id || '';

  // Load local reviews and check if user already reviewed
  useEffect(() => {
    const stored = getReviews(localId || businessId);
    const mapped: ReviewDisplay[] = stored.map((r) => ({
      id: r.id,
      author: r.author,
      rating: r.rating,
      date: new Date(r.createdAt).toLocaleDateString('pt-BR'),
      text: r.text,
      tags: [],
      isLocal: true,
    }));
    setLocalReviews(mapped);

    if (userId) {
      const alreadyReviewed = stored.some((r) => r.userId === userId);
      if (alreadyReviewed) {
        setHasReviewed(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localId || businessId, userId]);

  const [hasReviewed, setHasReviewed] = useState(false);

  // Get user display name from Clerk
  const getUserName = (): string => {
    if (!user) return 'Usuário Anônimo';
    return (
      user.fullName ||
      user.username ||
      user.emailAddresses?.[0]?.emailAddress ||
      'Usuário Anônimo'
    );
  };

  // Merge mock reviews (server-side) with local reviews
  const mockReviews: ReviewDisplay[] = business.reviews.map((r) => ({
    id: r.id,
    author: r.author,
    rating: r.rating,
    date: r.date,
    text: r.text,
    tags: r.tags,
    isLocal: false,
  }));

  // Combine: local reviews first (newest), then mock reviews
  const allReviews = [...localReviews, ...mockReviews].sort((a, b) => {
    // Local reviews shown first, then sort by date descending
    if (a.isLocal && !b.isLocal) return -1;
    if (!a.isLocal && b.isLocal) return 1;
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  const averageRating =
    allReviews.length > 0
      ? allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      : business.rating;

  // Validation
  const validate = (): boolean => {
    const newErrors: { rating?: string; comment?: string } = {};
    if (userRating === 0) {
      newErrors.rating = 'Por favor, selecione uma avaliação de 1 a 5 estrelas.';
    }
    if (!userComment.trim() || userComment.trim().length < 10) {
      newErrors.comment = 'O comentário deve ter pelo menos 10 caracteres.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});
    const userName = getUserName();

    const newReviewPayload = {
      author: userName,
      rating: userRating,
      text: userComment.trim(),
      userId: userId || 'anonymous',
    };

    try {
      // 1. Save to localStorage immediately
      const saved = saveReview(localId || businessId, newReviewPayload);

      // 2. Try API POST (non-blocking)
      try {
        await fetch('/api/reviews', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessId,
            ...newReviewPayload,
          }),
        });
      } catch {
        // API failure is non-blocking — local save succeeded
        console.log('Review saved locally (API unavailable)');
      }

      // 3. Add to local reviews immediately for real-time display
      const displayReview: ReviewDisplay = {
        id: saved.id,
        author: saved.author,
        rating: saved.rating,
        date: new Date(saved.createdAt).toLocaleDateString('pt-BR'),
        text: saved.text,
        tags: [],
        isLocal: true,
      };

      setLocalReviews((prev) => [displayReview, ...prev]);
      setHasReviewed(true);
      setSuccessMessage('Avaliação enviada com sucesso!');
      setUserRating(0);
      setUserComment('');

      // Auto-dismiss success message after 4 seconds
      setTimeout(() => setSuccessMessage(''), 4000);
    } catch (err) {
      setErrors({ comment: 'Erro ao enviar avaliação. Tente novamente.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mb-12">
      <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
        {/* Header */}
        <header className="flex items-center justify-between mb-8">
          <div>
            <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white">
              Avaliações
            </h2>
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <StarRating rating={averageRating} size="md" />
              </div>
              <span className="font-bold text-xl text-noche-lima dark:text-white">
                {averageRating.toFixed(1)}
              </span>
              <span className="text-gray-600 dark:text-gray-400">
                ({allReviews.length} avaliação{allReviews.length !== 1 ? 'ões' : ''})
              </span>
            </div>
          </div>
        </header>

        {/* Success Toast */}
        {successMessage && (
          <div className="mb-6 bg-verde-brasil/10 dark:bg-verde-brasil/5 border border-verde-brasil/30 text-verde-brasil px-4 py-3 rounded-xl text-center font-semibold animate-fade-in transition-opacity duration-300">
            <span className="mr-2">✅</span>
            {successMessage}
          </div>
        )}

        {/* Review Form — shown between header and reviews list */}
        {isLoaded && (
          <>
            {hasReviewed ? (
              <div className="mb-8 bg-oro-inca/10 dark:bg-oro-inca/5 border border-oro-inca/30 rounded-xl p-5 text-center">
                <p className="text-noche-lima dark:text-white font-semibold text-lg">
                  Você já avaliou este negócio
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Obrigado pelo seu feedback! Sua avaliação aparece abaixo.
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleSubmit}
                className="mb-8 bg-creme-andino dark:bg-zinc-900 rounded-xl p-6 border border-oro-inca/20"
              >
                <h3 className="font-playfair text-lg font-bold text-noche-lima dark:text-white mb-4">
                  Deixe sua avaliação
                </h3>

                {/* Star Rating Selector */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Sua nota
                  </label>
                  <InteractiveStarRating
                    value={userRating}
                    onChange={(val) => {
                      setUserRating(val);
                      if (errors.rating) {
                        setErrors((prev) => ({ ...prev, rating: undefined }));
                      }
                    }}
                    size="lg"
                  />
                  {errors.rating && (
                    <p className="text-aji-rojo text-sm mt-1 flex items-center gap-1">
                      <span>⚠</span>
                      {errors.rating}
                    </p>
                  )}
                </div>

                {/* Comment Textarea */}
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Seu comentário
                  </label>
                  <textarea
                    value={userComment}
                    onChange={(e) => {
                      setUserComment(e.target.value);
                      if (errors.comment) {
                        setErrors((prev) => ({ ...prev, comment: undefined }));
                      }
                    }}
                    className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo resize-none transition-shadow"
                    rows={4}
                    placeholder="Conte sua experiência (mínimo 10 caracteres)..."
                    maxLength={500}
                  />
                  <div className="flex justify-between items-center mt-1">
                    {errors.comment ? (
                      <p className="text-aji-rojo text-sm flex items-center gap-1">
                        <span>⚠</span>
                        {errors.comment}
                      </p>
                    ) : (
                      <span />
                    )}
                    <span className="text-xs text-gray-400">
                      {userComment.length}/500
                    </span>
                  </div>
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <span className="animate-spin inline-block w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                      Enviando...
                    </>
                  ) : (
                    'Enviar Avaliação'
                  )}
                </button>
              </form>
            )}
          </>
        )}

        {/* If Clerk still loading, show a subtle placeholder */}
        {!isLoaded && (
          <div className="mb-8 bg-creme-andino dark:bg-zinc-900 rounded-xl p-6 border border-oro-inca/20 animate-pulse">
            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="h-10 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-4" />
            <div className="h-20 bg-gray-200 dark:bg-gray-700 rounded" />
          </div>
        )}

        {/* Reviews List */}
        <div className="space-y-6">
          {allReviews.length > 0 ? (
            allReviews.map((review) => (
              <article
                key={review.id}
                className={`rounded-xl p-6 border transition-all ${
                  review.isLocal
                    ? 'bg-verde-brasil/5 dark:bg-verde-brasil/10 border-verde-brasil/30'
                    : 'bg-creme-andino dark:bg-noche-lima border-oro-inca/20'
                }`}
              >
                <header className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aji-rojo to-oro-inca flex items-center justify-center text-white font-bold">
                      {review.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-noche-lima dark:text-white">
                        {review.author}
                        {review.isLocal && (
                          <span className="ml-2 text-xs bg-verde-brasil/20 text-verde-brasil px-2 py-0.5 rounded-full font-medium">
                            Nova
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {review.date}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <StarRating rating={review.rating} size="sm" />
                  </div>
                </header>
                <p className="text-gray-700 dark:text-gray-300 mb-4 italic">
                  &ldquo;{review.text}&rdquo;
                </p>
                {review.tags.length > 0 && (
                  <div className="flex items-center gap-2 flex-wrap">
                    {review.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="bg-aji-rojo/10 text-aji-rojo px-2 py-1 rounded-full text-xs font-medium"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
              </article>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Nenhuma avaliação ainda. Seja o primeiro a avaliar!
            </p>
          )}
        </div>
      </div>
    </section>
  );
};
