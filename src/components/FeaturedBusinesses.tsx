import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star, CaretRight, Storefront } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useHomeStore } from '../stores/useHomeStore';
import { SkeletonCard } from './SkeletonCard';

// High-quality Unsplash fallbacks per category
const UNSPLASH_FALLBACKS: Record<string, string> = {
  restaurante:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
  restaurantes:
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=800',
  mercado:
    'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=800',
  salon:
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&q=80&w=800',
  servicios:
    'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&q=80&w=800',
  salud:
    'https://images.unsplash.com/photo-1551076805-e1869033e561?auto=format&fit=crop&q=80&w=800',
  juridico:
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&q=80&w=800',
  financiero:
    'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?auto=format&fit=crop&q=80&w=800',
  inmuebles:
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&q=80&w=800',
};

const GENERAL_FALLBACK =
  'https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=800';

const getFallbackImage = (category: string): string => {
  const key = category?.toLowerCase().trim();
  return UNSPLASH_FALLBACKS[key] || GENERAL_FALLBACK;
};

const getCategoryBadge = (category: string) => {
  const cat = category?.toLowerCase() || '';
  const colors: Record<string, string> = {
    restaurante: 'bg-oro-inca/20 text-oro-inca dark:text-oro-inca',
    mercado: 'bg-green-100/80 text-green-800 dark:bg-green-900/40 dark:text-green-300',
    salon: 'bg-pink-100/80 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
    servicios: 'bg-blue-100/80 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300',
    salud: 'bg-teal-100/80 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300',
    juridico: 'bg-amber-100/80 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    financiero: 'bg-violet-100/80 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300',
    inmuebles: 'bg-sky-100/80 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300',
  };
  return colors[cat] || 'bg-gray-100/80 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
};

export const FeaturedBusinesses = () => {
  const { t } = useTranslation();
  const { featuredBusinesses, loading, error, fetchFeatured } = useHomeStore();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  const fadeIn = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.1 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
        };

  return (
    <section className="py-20 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.header
          {...fadeIn(0)}
          className="flex items-end justify-between mb-14"
        >
          <div>
            <span className="text-xs font-mono uppercase tracking-[0.2em] text-aji-rojo/60 mb-2 block">
              {t('featured.subtitle') || 'Destaques'}
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-noche-lima dark:text-white tracking-tighter">
              {t('featured.title')}
            </h2>
          </div>
          <Link
            to="/busca"
            className="hidden sm:inline-flex items-center gap-2 text-aji-rojo hover:text-aji-rojo/80 font-medium transition-colors group"
          >
            {t('featured.view_all')}
            <CaretRight
              size={16}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </Link>
        </motion.header>

        {/* Error state */}
        {error.featured && (
          <motion.div
            {...fadeIn(0.1)}
            className="mb-8 p-4 bg-aji-rojo/10 border border-aji-rojo/30 rounded-xl text-center"
          >
            <p className="text-aji-rojo text-sm">{t('common.error')}</p>
            <button
              onClick={fetchFeatured}
              className="mt-2 text-sm text-aji-rojo font-medium hover:underline"
            >
              {t('common.retry')}
            </button>
          </motion.div>
        )}

        {/* Grid */}
        {loading.featured ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} variant="card" />
            ))}
          </div>
        ) : featuredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredBusinesses.map((business, i) => (
              <motion.div key={business.id} {...fadeIn(0.1 + i * 0.08)}>
                <Link to={`/negocio/${business.id}`} className="block group">
                  <article className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden border border-oro-inca/10 hover:shadow-xl hover:border-aji-rojo/30 hover:-translate-y-1 transition-all duration-300">
                    {/* Cover Image */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-aji-rojo/10 to-oro-inca/5">
                      <img
                        src={
                          business.coverImage ||
                          getFallbackImage(business.category)
                        }
                        alt={business.name}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                        loading="lazy"
                      />

                      {/* Rating badge */}
                      <div className="absolute top-3 right-3">
                        <span className="bg-aji-rojo text-white px-2.5 py-1 rounded-full text-xs font-bold flex items-center gap-1 shadow-lg">
                          <Star size={12} weight="fill" />
                          {business.rating || '-'}
                        </span>
                      </div>

                      {/* Category badge */}
                      <div className="absolute top-3 left-3">
                        <span
                          className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider shadow-sm backdrop-blur-sm ${getCategoryBadge(business.category)}`}
                        >
                          {business.category}
                        </span>
                      </div>

                      {/* Gradient overlay at bottom for text readability */}
                      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/40 to-transparent" />
                    </div>

                    {/* Content */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-noche-lima dark:text-white mb-0.5 group-hover:text-aji-rojo transition-colors duration-300">
                        {business.name}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 flex items-center gap-1">
                        <span className="text-[11px] opacity-60">&#9906;</span>
                        {business.city}
                        {business.state ? `, ${business.state}` : ''}
                      </p>
                      {business.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {business.tags.slice(0, 3).map((tag, j) => (
                            <span
                              key={j}
                              className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-oro-inca/10 text-oro-inca dark:text-oro-inca/90"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              </motion.div>
            ))}
          </div>
        ) : (
          /* Empty state */
          <motion.div {...fadeIn(0.1)} className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-oro-inca/10 flex items-center justify-center">
              <Storefront size={36} className="text-oro-inca" weight="duotone" />
            </div>
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-6">
              {t('featured.no_results')}
            </p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 bg-aji-rojo text-white px-6 py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shadow-lg"
            >
              {t('featured.register')}
              <CaretRight size={16} />
            </Link>
          </motion.div>
        )}

        {/* Mobile "View All" */}
        {featuredBusinesses.length > 0 && (
          <motion.div
            {...fadeIn(0.5)}
            className="text-center mt-10 sm:hidden"
          >
            <Link
              to="/busca"
              className="inline-flex items-center gap-2 bg-aji-rojo text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shadow-lg"
            >
              {t('featured.view_all')}
              <CaretRight size={18} />
            </Link>
          </motion.div>
        )}
      </div>
    </section>
  );
};
