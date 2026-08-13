// src/components/CommunityAds.tsx
// Paid ads in the Comunidad section (Opción A: sidebar 300x250 IAB Medium
// Rectangle; Opción B: Google Shopping-style sponsored row above the topic
// list). Data comes from the public GET /api/ads endpoint. Renders nothing
// when there are no ads.
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CaretLeft, CaretRight, Megaphone, Star } from '@phosphor-icons/react';
import { getActiveAds, type CommunityAd } from '../lib/api';

const UNSPLASH_FALLBACKS: Record<string, string> = {
  restaurante:
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

const getFallbackImage = (category: string): string =>
  UNSPLASH_FALLBACKS[category?.toLowerCase().trim()] ||
  'https://images.unsplash.com/photo-1559329007-40df8a9345d8?auto=format&fit=crop&q=80&w=800';

interface CommunityAdsProps {
  variant?: 'sidebar' | 'featured';
  limit?: number;
}

export const CommunityAds = ({ variant = 'sidebar', limit = 4 }: CommunityAdsProps) => {
  const { t } = useTranslation();
  const [ads, setAds] = useState<CommunityAd[]>([]);
  const rowRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getActiveAds()
      .then((data) => {
        if (!cancelled) setAds(data.slice(0, limit));
      })
      .catch(() => {
        // silent — the section simply doesn't render
      });
    return () => {
      cancelled = true;
    };
  }, [limit]);

  // Featured row: track scroll reachability to show/hide the desktop arrows.
  const updateScrollState = () => {
    const el = rowRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    if (variant !== 'featured') return;
    const el = rowRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener('scroll', updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener('scroll', updateScrollState);
      ro.disconnect();
    };
  }, [variant, ads.length]);

  const scrollRow = (dir: number) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    rowRef.current?.scrollBy({
      left: dir * 272, // card width (w-64) + gap
      behavior: reduced ? 'auto' : 'smooth',
    });
  };

  if (ads.length === 0) return null;

  if (variant === 'featured') {
    return (
      <section className="mb-6 max-w-3xl" aria-label={t('ads.sidebarTitle')}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Megaphone size={14} weight="fill" className="text-oro-inca" />
            {t('ads.sidebarTitle')}
          </div>
          {ads.length > 1 && (canScrollLeft || canScrollRight) && (
            <div className="hidden lg:flex items-center gap-1.5">
              <button
                onClick={() => scrollRow(-1)}
                disabled={!canScrollLeft}
                aria-label="Anúncios anteriores"
                className="w-7 h-7 flex items-center justify-center rounded-full border border-oro-inca/30 text-noche-lima dark:text-white hover:bg-oro-inca/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CaretLeft size={14} weight="bold" />
              </button>
              <button
                onClick={() => scrollRow(1)}
                disabled={!canScrollRight}
                aria-label="Próximos anúncios"
                className="w-7 h-7 flex items-center justify-center rounded-full border border-oro-inca/30 text-noche-lima dark:text-white hover:bg-oro-inca/10 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <CaretRight size={14} weight="bold" />
              </button>
            </div>
          )}
        </div>

        {/* Google Shopping-style sponsored row: proportional image + text
            cards, horizontally scrollable (swipe on touch, arrows on desktop). */}
        <div
          ref={rowRef}
          tabIndex={0}
          aria-label={t('ads.sidebarTitle')}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-1 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden rounded-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-aji-rojo/50"
        >
          {ads.map((ad) => (
            <FeaturedAdCard key={ad.id} ad={ad} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <aside className="hidden lg:block w-[300px] shrink-0" aria-label={t('ads.sidebarTitle')}>
      <div className="sticky top-20 space-y-4">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          <Megaphone size={14} weight="fill" className="text-oro-inca" />
          {t('ads.sidebarTitle')}
        </div>
        {ads.slice(0, limit).map((ad) => (
          <AdCard key={ad.id} ad={ad} variant="sidebar" />
        ))}
      </div>
    </aside>
  );
};

// Featured card: Google Shopping-style result — proportional image block on
// top with the text underneath (title, business, rating), "Patrocinado"
// badge overlaid on the image. Fixed width, scroll-snapped in the row.
const FeaturedAdCard = ({ ad }: { ad: CommunityAd }) => {
  const { t } = useTranslation();
  const target = ad.targetUrl || `/negocio/${ad.businessId}`;
  const isExternal = Boolean(ad.targetUrl);

  const card = (
    <article className="group w-64 overflow-hidden rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima shadow-sm hover:shadow-lg hover:border-aji-rojo/40 transition-all">
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-aji-rojo/10 to-oro-inca/5">
        <img
          src={ad.imageUrl || getFallbackImage(ad.category)}
          alt={ad.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-noche-lima/90 dark:bg-zinc-900/90 text-[10px] font-bold uppercase tracking-wider text-oro-inca shadow-sm">
          <Megaphone size={10} weight="fill" />
          {t('ads.badge')}
        </span>
      </div>
      <div className="p-3.5">
        <h3 className="font-semibold text-noche-lima dark:text-white text-sm leading-snug group-hover:text-aji-rojo transition-colors line-clamp-2 min-h-[2.4rem]">
          {ad.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{ad.businessName}</span>
          {ad.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 shrink-0">
              <Star size={11} weight="fill" className="text-oro-inca" />
              {ad.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  if (isExternal) {
    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className="block shrink-0 snap-start"
        aria-label={ad.title}
      >
        {card}
      </a>
    );
  }
  return (
    <Link to={target} className="block shrink-0 snap-start" aria-label={ad.title}>
      {card}
    </Link>
  );
};

const AdCard = ({ ad }: { ad: CommunityAd }) => {
  const { t } = useTranslation();
  const target = ad.targetUrl || `/negocio/${ad.businessId}`;
  const isExternal = Boolean(ad.targetUrl);

  // Sidebar: 300x250 Medium Rectangle (IAB standard) — 6:5 image + text block.
  const card = (
    <article className="group overflow-hidden rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima shadow-sm hover:shadow-md hover:border-aji-rojo/40 transition-all">
      <div className="relative aspect-[6/5] bg-gradient-to-br from-aji-rojo/10 to-oro-inca/5">
        <img
          src={ad.imageUrl || getFallbackImage(ad.category)}
          alt={ad.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        <span className="absolute top-2 left-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-noche-lima/90 dark:bg-zinc-900/90 text-[10px] font-bold uppercase tracking-wider text-oro-inca shadow-sm">
          <Megaphone size={10} weight="fill" />
          {t('ads.badge')}
        </span>
      </div>
      <div className="p-3.5">
        <h3 className="font-bold text-noche-lima dark:text-white text-sm leading-snug group-hover:text-aji-rojo transition-colors">
          {ad.title}
        </h3>
        <div className="flex items-center gap-2 mt-1.5 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{ad.businessName}</span>
          {ad.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 shrink-0">
              <Star size={11} weight="fill" className="text-oro-inca" />
              {ad.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
    </article>
  );

  if (isExternal) {
    return (
      <a
        href={target}
        target="_blank"
        rel="noopener noreferrer"
        className="block"
        aria-label={ad.title}
      >
        {card}
      </a>
    );
  }
  return (
    <Link to={target} className="block" aria-label={ad.title}>
      {card}
    </Link>
  );
};

export default CommunityAds;
