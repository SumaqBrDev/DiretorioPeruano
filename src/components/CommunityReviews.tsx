// src/components/CommunityReviews.tsx
// "O que a comunidade diz" — mostrar reseñas aleatorias de 5 estrellas desde localStorage

import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, useReducedMotion } from 'motion/react';
import { Star } from '@phosphor-icons/react';
import { getBusinesses, getReviews } from '../lib/localData';

interface CommunityReview {
  id: string;
  author: string;
  businessName: string;
  rating: number;
  text: string;
}

export const CommunityReviews = () => {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();

  const reviews = useMemo<CommunityReview[]>(() => {
    const all: CommunityReview[] = [];
    const reviewIds = new Set<string>();

    // From localStorage (reviews by users)
    const businesses = getBusinesses();
    businesses.forEach((biz) => {
      const storedReviews = getReviews(biz.id);
      storedReviews.forEach((r) => {
        if (r.rating >= 4) { // Use 4+ for community section
          const key = `${r.author}_${r.text}`;
          if (!reviewIds.has(key)) {
            reviewIds.add(key);
            all.push({
              id: r.id,
              author: r.author,
              businessName: biz.name,
              rating: r.rating,
              text: r.text,
            });
          }
        }
      });
    });

    // Shuffle for randomness each load
    const shuffled = [...all].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 6);
  }, []);

  if (reviews.length === 0) return null;

  const fadeIn = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.1 },
          transition: { duration: 0.5, delay, ease: 'easeOut' as const },
        };

  return (
    <section className="py-20 bg-creme-andino dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.header {...fadeIn(0)} className="text-center mb-16">
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-aji-rojo/60 mb-2 block">
            {t('community.subtitle') || 'Comunidade'}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-4 tracking-tighter">
            {t('community.title') || 'O que a comunidade diz'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('community.subtitle_text') || 'Veja o que os usuários estão falando sobre os negócios peruanos cadastrados'}
          </p>
        </motion.header>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {reviews.map((review, i) => (
            <motion.div key={review.id} {...fadeIn(0.1 + i * 0.08)}>
              <article className="bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-lg border border-oro-inca/20 hover:shadow-xl hover:border-aji-rojo/50 transition-all duration-300 h-full flex flex-col">
                {/* Stars */}
                <div className="flex items-center gap-0.5 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star
                      key={s}
                      size={18}
                      weight={s < review.rating ? 'fill' : 'regular'}
                      className={
                        s < review.rating
                          ? 'text-oro-inca'
                          : 'text-gray-300 dark:text-gray-600'
                      }
                    />
                  ))}
                </div>

                {/* Quote */}
                <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed line-clamp-4 flex-grow">
                  &ldquo;{review.text}&rdquo;
                </p>

                {/* Author + Business */}
                <div className="border-t border-oro-inca/20 pt-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aji-rojo to-oro-inca flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {review.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-noche-lima dark:text-white text-sm">
                        {review.author}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {review.businessName}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};