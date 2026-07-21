import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Star } from '@phosphor-icons/react';
import { useHomeStore } from '../stores/useHomeStore';
import { SkeletonCard } from './SkeletonCard';

export const TestimonialsSection = () => {
  const { t } = useTranslation();
  const { testimonials, loading, error, fetchTestimonials } = useHomeStore();

  useEffect(() => {
    fetchTestimonials();
  }, [fetchTestimonials]);

  if (!loading.testimonials && testimonials.length === 0) {
    return null;
  }

  return (
    <section className="py-20 bg-creme-andino dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        <header className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-4 tracking-tighter">
            {t('testimonials.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('testimonials.subtitle')}
          </p>
        </header>

        {error.testimonials && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-aji-rojo/10 border border-aji-rojo/30 rounded-xl text-center">
            <p className="text-aji-rojo text-sm">{t('common.error')}</p>
            <button
              onClick={fetchTestimonials}
              className="mt-2 text-sm text-aji-rojo font-medium hover:underline"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-3 gap-8">
          {loading.testimonials
            ? Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} variant="testimonial" />)
            : testimonials.map((testimonial, i) => (
                <article
                  key={testimonial.id}
                  className="bg-white dark:bg-zinc-800 rounded-2xl p-8 shadow-lg border border-oro-inca/20 hover:shadow-xl hover:border-aji-rojo/50 transition-all duration-300"
                >
                  {/* Stars */}
                  <div className="flex items-center gap-0.5 mb-4">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star
                        key={s}
                        size={18}
                        weight={s < testimonial.rating ? 'fill' : 'regular'}
                        className={s < testimonial.rating ? 'text-oro-inca' : 'text-gray-300 dark:text-gray-600'}
                      />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed line-clamp-4">
                    &ldquo;{testimonial.text}&rdquo;
                  </p>

                  {/* Tags */}
                  {testimonial.tags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      {testimonial.tags.map((tag, ti) => (
                        <span
                          key={ti}
                          className="bg-aji-rojo/10 text-aji-rojo px-2 py-1 rounded-full text-xs font-medium"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Author */}
                  <div className="border-t border-oro-inca/20 pt-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aji-rojo to-oro-inca flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {testimonial.author.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-noche-lima dark:text-white text-sm">
                        {testimonial.author}
                      </p>
                      {testimonial.city && (
                        <p className="text-xs text-gray-500 dark:text-gray-400">{testimonial.city}</p>
                      )}
                    </div>
                  </div>
                </article>
              ))}
        </div>
      </div>
    </section>
  );
};
