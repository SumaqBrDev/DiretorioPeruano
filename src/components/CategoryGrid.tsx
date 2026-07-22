import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Storefront,
  ShoppingBag,
  Scissors,
  Briefcase,
  HeartStraight,
  Scales,
  CurrencyDollar,
  House,
} from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';
import { useHomeStore } from '../stores/useHomeStore';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  restaurantes: <Storefront size={28} weight="duotone" />,
  mercados: <ShoppingBag size={28} weight="duotone" />,
  salon: <Scissors size={28} weight="duotone" />,
  servicios: <Briefcase size={28} weight="duotone" />,
  salud: <HeartStraight size={28} weight="duotone" />,
  juridico: <Scales size={28} weight="duotone" />,
  financiero: <CurrencyDollar size={28} weight="duotone" />,
  inmuebles: <House size={28} weight="duotone" />,
};

const CATEGORY_BG: Record<string, string> = {
  restaurantes:
    'from-red-800/40 to-orange-900/40 dark:from-red-600/20 dark:to-orange-700/20',
  mercados:
    'from-green-800/40 to-emerald-900/40 dark:from-green-600/20 dark:to-emerald-700/20',
  salon:
    'from-pink-800/40 to-purple-900/40 dark:from-pink-600/20 dark:to-purple-700/20',
  servicios:
    'from-blue-800/40 to-indigo-900/40 dark:from-blue-600/20 dark:to-indigo-700/20',
  salud:
    'from-teal-800/40 to-cyan-900/40 dark:from-teal-600/20 dark:to-cyan-700/20',
  juridico:
    'from-amber-800/40 to-yellow-900/40 dark:from-amber-600/20 dark:to-yellow-700/20',
  financiero:
    'from-violet-800/40 to-fuchsia-900/40 dark:from-violet-600/20 dark:to-fuchsia-700/20',
  inmuebles:
    'from-sky-800/40 to-blue-900/40 dark:from-sky-600/20 dark:to-blue-700/20',
};

const CATEGORY_IMAGES: Record<string, string> = {
  restaurantes:
    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=800',
  mercados:
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

export const CategoryGrid = () => {
  const { t } = useTranslation();
  const { categories, loading, error, fetchCategories } = useHomeStore();
  const reduceMotion = useReducedMotion();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const fadeIn = (delay: number) =>
    reduceMotion
      ? {}
      : {
          initial: { opacity: 0, y: 24 },
          whileInView: { opacity: 1, y: 0 },
          viewport: { once: true, amount: 0.2 },
          transition: { duration: 0.5, delay, ease: [0.16, 1, 0.3, 1] },
        };

  return (
    <section className="py-20 bg-creme-andino dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.header
          {...fadeIn(0)}
          className="text-center mb-16"
        >
          <span className="text-xs font-mono uppercase tracking-[0.2em] text-aji-rojo/60 mb-3 block">
            {t('categories.title').substring(0, 12)}
          </span>
          <h2 className="text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-4 tracking-tighter">
            {t('categories.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('categories.subtitle')}
          </p>
        </motion.header>

        {/* Error state */}
        {error.categories && (
          <motion.div
            {...fadeIn(0.1)}
            className="max-w-2xl mx-auto mb-8 p-4 bg-aji-rojo/10 border border-aji-rojo/30 rounded-xl text-center"
          >
            <p className="text-aji-rojo text-sm">{t('common.error')}</p>
            <button
              onClick={fetchCategories}
              className="mt-2 text-sm text-aji-rojo font-medium hover:underline"
            >
              {t('common.retry')}
            </button>
          </motion.div>
        )}

        {/* Bento Grid */}
        {loading.categories ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-gray-200 dark:bg-zinc-700 rounded-2xl" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 auto-rows-[minmax(180px,auto)]">
            {categories.map((cat, index) => {
              // Bento layout: make first cell span full on mobile, 2-col on desktop
              const isLarge = index === 0;
              const bgCategory = CATEGORY_BG[cat.slug] || CATEGORY_BG.restaurantes;
              const bgImage = CATEGORY_IMAGES[cat.slug] || CATEGORY_IMAGES.restaurantes;

              return (
                <motion.div
                  key={cat.slug}
                  {...fadeIn(0.1 + index * 0.05)}
                  className={`${isLarge ? 'md:col-span-2 md:row-span-2' : ''}`}
                >
                  <Link
                    to={`/busca?categoria=${cat.slug}`}
                    className="group relative block w-full h-full rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-500"
                  >
                    {/* Background image */}
                    <div className="absolute inset-0">
                      <img
                        src={bgImage}
                        alt=""
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                        loading="lazy"
                      />
                      <div
                        className={`absolute inset-0 bg-gradient-to-t ${bgCategory} via-black/30 to-black/10`}
                      />
                    </div>

                    {/* Content */}
                    <div className="relative z-10 p-6 flex flex-col justify-end h-full min-h-[180px]">
                      {/* Icon */}
                      <div className="mb-auto">
                        <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shadow-lg ring-1 ring-white/20 group-hover:scale-110 group-hover:-rotate-6 transition-all duration-300">
                          {CATEGORY_ICONS[cat.slug] || <Storefront size={28} />}
                        </div>
                      </div>

                      {/* Text */}
                      <div>
                        <h3 className="text-xl font-bold text-white mb-0.5 group-hover:text-oro-inca transition-colors duration-300">
                          {cat.name?.['pt-BR'] || cat.slug}
                        </h3>
                        <p className="text-white/70 text-sm font-medium">
                          {cat.count > 0
                            ? `${cat.count} ${t('categories.coming_soon').toLowerCase() || 'opções'}`
                            : t('categories.coming_soon')}
                        </p>
                      </div>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};
