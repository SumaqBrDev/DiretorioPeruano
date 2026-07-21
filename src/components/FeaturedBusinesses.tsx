import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Star } from '@phosphor-icons/react';
import { useHomeStore } from '../stores/useHomeStore';
import { SkeletonCard } from './SkeletonCard';

export const FeaturedBusinesses = () => {
  const { t } = useTranslation();
  const { featuredBusinesses, loading, error, fetchFeatured } = useHomeStore();

  useEffect(() => {
    fetchFeatured();
  }, [fetchFeatured]);

  const getCategoryBadge = (category: string) => {
    const catLower = category.toLowerCase();
    const colors: Record<string, string> = {
      restaurante: 'bg-aji-rojo/10 text-aji-rojo',
      mercado: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      salon: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400',
      servicios: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
      salud: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400',
      juridico: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      financiero: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400',
      inmuebles: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
    };
    return colors[catLower] || 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  return (
    <section className="py-20 bg-white dark:bg-zinc-950">
      <div className="container mx-auto px-4">
        <header className="flex items-center justify-between mb-12">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-2 tracking-tighter">
              {t('featured.title')}
            </h2>
            <p className="text-gray-600 dark:text-gray-400">
              {t('featured.subtitle')}
            </p>
          </div>
          <Link
            to="/busca"
            className="text-aji-rojo hover:underline font-medium hidden sm:block"
          >
            {t('featured.view_all')} &rarr;
          </Link>
        </header>

        {error.featured && (
          <div className="mb-8 p-4 bg-aji-rojo/10 border border-aji-rojo/30 rounded-xl text-center">
            <p className="text-aji-rojo text-sm">{t('common.error')}</p>
            <button
              onClick={fetchFeatured}
              className="mt-2 text-sm text-aji-rojo font-medium hover:underline"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        {loading.featured ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} variant="card" />
            ))}
          </div>
        ) : featuredBusinesses.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {featuredBusinesses.map((business) => (
              <Link
                key={business.id}
                to={`/negocio/${business.id}`}
                className="block group"
              >
                <article className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden border border-oro-inca/20 hover:shadow-xl hover:border-aji-rojo/50 hover:-translate-y-1 transition-all duration-300">
                  {/* Cover Image */}
                  <div className="relative aspect-video bg-gradient-to-br from-aji-rojo/20 to-oro-inca/20 flex items-center justify-center overflow-hidden">
                    {business.coverImage ? (
                      <img
                        src={business.coverImage}
                        alt={business.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-6xl opacity-40">
                        {business.category === 'restaurante' ? '🍽️' : '🏪'}
                      </span>
                    )}
                    {/* Rating Badge */}
                    <div className="absolute top-3 right-3">
                      <span className="bg-aji-rojo text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                        <Star size={14} weight="fill" />
                        {business.rating || '-'}
                      </span>
                    </div>
                    {/* Category Badge */}
                    <div className="absolute top-3 left-3">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getCategoryBadge(business.category)}`}>
                        {business.category}
                      </span>
                    </div>
                  </div>
                  {/* Content */}
                  <div className="p-5">
                    <h3 className="text-xl font-bold text-noche-lima dark:text-white mb-1 group-hover:text-aji-rojo transition-colors">
                      {business.name}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 flex items-center gap-1">
                      <span className="text-base">📍</span>
                      {business.city}{business.state ? ` - ${business.state}` : ''}
                    </p>
                    {business.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {business.tags.slice(0, 3).map((tag, i) => (
                          <span
                            key={i}
                            className="bg-oro-inca/20 text-oro-inca dark:text-oro-inca/80 px-3 py-1 rounded-full text-xs font-medium"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </article>
              </Link>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <p className="text-gray-500 dark:text-gray-400 text-lg mb-4">
              {t('featured.no_results')}
            </p>
            <Link
              to="/onboarding"
              className="inline-flex items-center gap-2 bg-aji-rojo text-white px-6 py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-all"
            >
              {t('featured.register')}
              <span>&rarr;</span>
            </Link>
          </div>
        )}

        <div className="text-center mt-10 sm:hidden">
          <Link
            to="/busca"
            className="inline-flex items-center gap-2 bg-aji-rojo text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shadow-lg"
          >
            {t('featured.view_all')}
            <span>&rarr;</span>
          </Link>
        </div>
      </div>
    </section>
  );
};
