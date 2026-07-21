import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight } from '@phosphor-icons/react';

export const BusinessOwnerCTA = () => {
  const { t } = useTranslation();

  return (
    <section className="py-24 bg-gradient-to-r from-aji-rojo via-aji-rojo/90 to-oro-inca relative overflow-hidden">
      {/* Background decorative circles */}
      <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-white/5" aria-hidden="true" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5" aria-hidden="true" />

      <div className="container mx-auto px-4 text-center relative z-10">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4 tracking-tighter">
          {t('cta.title')}
        </h2>
        <p className="text-white/80 text-lg mb-10 max-w-2xl mx-auto leading-relaxed">
          {t('cta.subtitle')}
        </p>
        <Link
          to="/onboarding"
          className="inline-flex items-center gap-2 bg-white text-aji-rojo px-8 py-4 rounded-xl font-semibold text-lg hover:bg-white/90 active:scale-[0.98] transition-all shadow-xl"
        >
          {t('cta.button')}
          <ArrowRight size={20} weight="bold" />
        </Link>
      </div>
    </section>
  );
};
