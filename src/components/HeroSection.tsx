import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass } from '@phosphor-icons/react';
import { motion, useReducedMotion } from 'motion/react';

export const HeroSection = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const reduceMotion = useReducedMotion();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    navigate(q ? `/busca?q=${encodeURIComponent(q)}` : '/busca');
  };

  const fadeUp = (delay: number) =>
    reduceMotion
      ? { initial: {}, animate: {} }
      : {
          initial: { opacity: 0, y: 40 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.7, delay, ease: "easeOut" as any },
        };

  return (
    <section className="relative min-h-[90dvh] flex items-center justify-center overflow-hidden z-0">
      {/* Full-bleed background image overlay */}
      <div className="absolute inset-0 -z-10">
        <img
          src="https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=85&w=1920"
          alt=""
          className="w-full h-full object-cover"
          loading="eager"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-noche-lima/70 via-noche-lima/50 to-aji-rojo/30 dark:from-black/80 dark:via-black/60 dark:to-aji-rojo/20" />
      </div>

      {/* Subtle pattern texture overlay */}
      <div
        className="absolute inset-0 -z-10 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
        }}
      />

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="max-w-4xl mx-auto text-center">
          {/* Brand Badge */}
          <motion.div
            {...fadeUp(0.1)}
            className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md text-white px-5 py-2 rounded-full text-sm font-medium mb-8 border border-white/20 shadow-lg"
          >
            <span className="w-2 h-2 rounded-full bg-oro-inca animate-pulse" />
            {t('hero.badge')}
          </motion.div>

          {/* Main Headline */}
          <motion.h1
            {...fadeUp(0.25)}
            className="text-4xl md:text-5xl lg:text-7xl font-bold text-white mb-6 tracking-tighter leading-[1.05]"
            dangerouslySetInnerHTML={{
              __html: t('hero.headline', {
                highlight:
                  '<span class="text-oro-inca">Perú</span>',
              }),
            }}
          />

          {/* Subtitle */}
          <motion.p
            {...fadeUp(0.4)}
            className="text-lg md:text-xl text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed"
          >
            {t('hero.subtitle')}
          </motion.p>

          {/* Search Bar */}
          <motion.div {...fadeUp(0.55)}>
            <form onSubmit={handleSearch} className="max-w-2xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-2 flex items-center gap-2 transition-all duration-300">
                <MagnifyingGlass size={24} className="ml-4 text-white/60 shrink-0" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('hero.search_placeholder')}
                  className="flex-1 bg-transparent placeholder-white/50 text-lg focus:outline-none text-white"
                />
                <button
                  type="submit"
                  className="px-6 py-3 bg-oro-inca text-noche-lima rounded-xl font-semibold text-base hover:bg-oro-inca/90 active:scale-[0.98] transition-all shadow-lg shrink-0"
                >
                  {t('hero.search_button')}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Explore Link */}
          <motion.p
            {...fadeUp(0.7)}
            className="text-center text-white/60 mt-4 text-sm"
          >
            <a
              href="/busca"
              className="text-oro-inca hover:text-white hover:underline font-medium transition-colors group"
            >
              {t('hero.explore_link')}
              <span className="ml-1 inline-block transition-transform group-hover:translate-x-0.5">
                &rarr;
              </span>
            </a>
          </motion.p>
        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
        animate={reduceMotion ? { opacity: 1 } : { opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2"
      >
        <motion.div
          animate={reduceMotion ? {} : { y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2, ease: 'easeInOut' }}
          className="w-6 h-10 rounded-full border-2 border-white/30 flex items-start justify-center p-1.5"
        >
          <div className="w-1.5 h-3 rounded-full bg-white/60" />
        </motion.div>
      </motion.div>
    </section>
  );
};
