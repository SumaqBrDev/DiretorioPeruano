import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Storefront, ShoppingBag, Scissors, Briefcase, Heart, Scales, CurrencyDollar, House } from '@phosphor-icons/react';
import { useHomeStore } from '../stores/useHomeStore';
import { SkeletonCard } from './SkeletonCard';

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  restaurantes: <Storefront size={32} weight="duotone" />,
  mercados: <ShoppingBag size={32} weight="duotone" />,
  salon: <Scissors size={32} weight="duotone" />,
  servicios: <Briefcase size={32} weight="duotone" />,
  salud: <Heart size={32} weight="duotone" />,
  juridico: <Scales size={32} weight="duotone" />,
  financiero: <CurrencyDollar size={32} weight="duotone" />,
  inmuebles: <House size={32} weight="duotone" />,
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  restaurantes: 'from-red-100 to-orange-100 dark:from-red-950/30 dark:to-orange-950/30',
  mercados: 'from-green-100 to-emerald-100 dark:from-green-950/30 dark:to-emerald-950/30',
  salon: 'from-pink-100 to-purple-100 dark:from-pink-950/30 dark:to-purple-950/30',
  servicios: 'from-blue-100 to-indigo-100 dark:from-blue-950/30 dark:to-indigo-950/30',
  salud: 'from-teal-100 to-cyan-100 dark:from-teal-950/30 dark:to-cyan-950/30',
  juridico: 'from-amber-100 to-yellow-100 dark:from-amber-950/30 dark:to-yellow-950/30',
  financiero: 'from-violet-100 to-fuchsia-100 dark:from-violet-950/30 dark:to-fuchsia-950/30',
  inmuebles: 'from-sky-100 to-blue-100 dark:from-sky-950/30 dark:to-blue-950/30',
};

export const CategoryGrid = () => {
  const { t } = useTranslation();
  const { categories, loading, error, fetchCategories } = useHomeStore();

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  return (
    <section className="py-20 bg-creme-andino dark:bg-zinc-900">
      <div className="container mx-auto px-4">
        <header className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-4 tracking-tighter">
            {t('categories.title')}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            {t('categories.subtitle')}
          </p>
        </header>

        {error.categories && (
          <div className="max-w-2xl mx-auto mb-8 p-4 bg-aji-rojo/10 border border-aji-rojo/30 rounded-xl text-center">
            <p className="text-aji-rojo text-sm">{t('common.error')}</p>
            <button
              onClick={fetchCategories}
              className="mt-2 text-sm text-aji-rojo font-medium hover:underline"
            >
              {t('common.retry')}
            </button>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
          {loading.categories
            ? Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="aspect-square bg-gray-200 dark:bg-zinc-700 rounded-2xl" />
                </div>
              ))
            : categories.map((cat) => (
                <Link
                  key={cat.slug}
                  to={`/busca?categoria=${cat.slug}`}
                  className="group block p-6 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-oro-inca/20 hover:border-aji-rojo/50 hover:shadow-xl transition-all duration-300 text-center"
                >
                  <div
                    className={`w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 transition-transform group-hover:scale-110 group-hover:-rotate-3 bg-gradient-to-br ${CATEGORY_GRADIENTS[cat.slug] || 'from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700'}`}
                  >
                    <span className="text-aji-rojo dark:text-aji-rojo/80">
                      {CATEGORY_ICONS[cat.slug]}
                    </span>
                  </div>
                  <h3 className="font-semibold text-noche-lima dark:text-white mb-1">
                    {cat.name?.['pt-BR'] || cat.slug}
                  </h3>
                  <p className="text-sm text-aji-rojo font-medium">
                    {cat.count > 0 ? `${cat.count}+ opções` : t('categories.coming_soon')}
                  </p>
                </Link>
              ))}
        </div>
      </div>
    </section>
  );
};
