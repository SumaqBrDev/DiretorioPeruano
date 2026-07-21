import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react';

export const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    if (q) {
      navigate(`/busca?q=${encodeURIComponent(q)}`);
    } else {
      navigate('/busca');
    }
  };

  return (
    <section className="relative min-h-[90dvh] flex items-center justify-center bg-gradient-to-br from-creme-andino via-white to-oro-inca/10 dark:from-zinc-950 dark:via-zinc-900 dark:to-aji-rojo/10 overflow-hidden">
      {/* Decorative background pattern */}
      <div className="absolute inset-0 opacity-[0.03]" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="cp-pattern" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
              <path d="M12 0L24 12L12 24L0 12Z" fill="none" stroke="#C0392B" strokeWidth="0.3" />
              <circle cx="12" cy="12" r="4" fill="#F39C12" opacity="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#cp-pattern)" />
        </svg>
      </div>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Brand Badge */}
          <div className="inline-flex items-center gap-2 bg-aji-rojo/10 text-aji-rojo px-4 py-2 rounded-full text-sm font-medium mb-8">
            <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
              <circle cx="8" cy="8" r="6" />
            </svg>
            {t('hero.badge')}
          </div>

          {/* Main Headline */}
          <h1
            className="text-4xl md:text-5xl lg:text-7xl font-bold text-noche-lima dark:text-white mb-6 tracking-tighter leading-none"
            dangerouslySetInnerHTML={{ __html: t('hero.headline', { highlight: '<span class="text-aji-rojo">Perú</span>' }) }}
          />

          <p className="text-lg md:text-xl text-gray-600 dark:text-gray-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero.subtitle')}
          </p>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-2 flex items-center gap-2 border border-oro-inca/20 dark:border-oro-inca/30 focus-within:border-aji-rojo/50 focus-within:ring-2 focus-within:ring-aji-rojo/20 transition-all">
              <MagnifyingGlass size={24} className="ml-4 text-gray-400 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('hero.search_placeholder')}
                className="flex-1 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 text-lg focus:outline-none text-noche-lima dark:text-white"
              />
              <button
                type="submit"
                className="px-6 py-3 bg-aji-rojo text-white rounded-xl font-semibold text-base hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shadow-lg shrink-0"
              >
                {t('hero.search_button')}
              </button>
            </div>
          </form>

          <p className="text-center text-gray-500 dark:text-gray-400 mt-4 text-sm">
            <a href="/busca" className="text-aji-rojo hover:underline font-medium">
              {t('hero.explore_link')}
            </a>
          </p>
        </div>
      </div>
    </section>
  );
};
