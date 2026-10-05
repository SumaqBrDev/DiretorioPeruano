import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

/**
 * Catch-all screen for unmatched routes.
 *
 * Previously an unknown path matched no route and the router rendered nothing,
 * leaving a blank page: a visitor who typed "/buscar" instead of "/busca" saw
 * an empty screen and had no reason to believe the site worked at all. This
 * states what happened and offers the two destinations that matter.
 */
export const NotFound = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950 px-4">
      <div className="w-full max-w-md text-center">
        <p className="font-playfair text-6xl font-bold text-aji-rojo mb-4">404</p>
        <h1 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-3">
          {t('not_found.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
          {t('not_found.description')}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="bg-aji-rojo text-white px-6 py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shadow-lg"
          >
            {t('not_found.home')}
          </Link>
          <Link
            to="/busca"
            className="px-6 py-3 rounded-xl font-semibold border border-oro-inca/40 text-noche-lima dark:text-white hover:bg-oro-inca/10 active:scale-[0.98] transition-all"
          >
            {t('not_found.search')}
          </Link>
        </div>
      </div>
    </div>
  );
};
