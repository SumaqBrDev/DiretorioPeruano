// src/components/CommunityAds.tsx
// Paid ads in the Comunidad section (Opción A: sidebar 300x250 IAB Medium
// Rectangle; Opción B: featured card above the topic list). Data comes from
// the public GET /api/ads endpoint. Renders nothing when there are no ads.
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Megaphone, Star } from '@phosphor-icons/react';
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
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);

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

  // Featured carousel: auto-advance every 6s, pause on hover, wrap around.
  // Respects prefers-reduced-motion (no auto-rotation; user navigates manually).
  useEffect(() => {
    if (variant !== 'featured' || ads.length <= 1 || paused) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return;
    const timer = setInterval(() => {
      setActiveIndex((i) => (i + 1) % ads.length);
    }, 6000);
    return () => clearInterval(timer);
  }, [variant, ads.length, paused]);

  if (ads.length === 0) return null;

  if (variant === 'featured') {
    const isCarousel = ads.length > 1;
    return (
      <div
        className="mb-6 max-w-3xl"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
            <Megaphone size={14} weight="fill" className="text-oro-inca" />
            {t('ads.sidebarTitle')}
          </div>
          {isCarousel && ads.length > 1 && (
            <span className="text-[11px] text-gray-400 dark:text-gray-500 tabular-nums">
              {activeIndex + 1} / {ads.length}
            </span>
          )}
        </div>

        {/* Slides */}
        <div className="relative overflow-hidden rounded-xl">
          <div
            className="flex transition-transform duration-500 ease-out"
            style={{ transform: `translateX(-${activeIndex * 100}%)` }}
          >
            {ads.slice(0, 2).map((ad) => (
              <div key={ad.id} className="w-full shrink-0 px-0.5">
                <AdCard ad={ad} variant="featured" />
              </div>
            ))}
          </div>
        </div>

        {/* Dots */}
        {isCarousel && (
          <div className="flex items-center justify-center gap-2 mt-3">
            {ads.slice(0, 2).map((ad, i) => (
              <button
                key={ad.id}
                onClick={() => setActiveIndex(i)}
                aria-label={`Anúncio ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === activeIndex
                    ? 'w-6 bg-aji-rojo'
                    : 'w-2 bg-gray-300 dark:bg-zinc-600 hover:bg-gray-400'
                }`}
              />
            ))}
          </div>
        )}
      </div>
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

const AdCard = ({ ad, variant }: { ad: CommunityAd; variant: 'sidebar' | 'featured' }) => {
  const { t } = useTranslation();
  const target = ad.targetUrl || `/negocio/${ad.businessId}`;
  const isExternal = Boolean(ad.targetUrl);

  // Featured: compact horizontal banner (thumb + text) — commercial standard
  // for sponsored rows in lists (Google Ads / native ad pattern).
  const featuredCard = (
    <article className="group flex items-center gap-4 overflow-hidden rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima shadow-sm hover:shadow-md hover:border-aji-rojo/40 transition-all p-3">
      <div className="relative w-24 h-16 shrink-0 overflow-hidden rounded-lg bg-gradient-to-br from-aji-rojo/10 to-oro-inca/5">
        <img
          src={ad.imageUrl || getFallbackImage(ad.category)}
          alt={ad.title}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="font-semibold text-noche-lima dark:text-white text-sm leading-snug group-hover:text-aji-rojo transition-colors truncate">
          {ad.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 dark:text-gray-400">
          <span className="truncate">{ad.businessName}</span>
          {ad.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 shrink-0">
              <Star size={11} weight="fill" className="text-oro-inca" />
              {ad.rating.toFixed(1)}
            </span>
          )}
        </div>
      </div>
      <span className="shrink-0 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-noche-lima/90 dark:bg-zinc-900/90 text-[10px] font-bold uppercase tracking-wider text-oro-inca shadow-sm">
        <Megaphone size={10} weight="fill" />
        {t('ads.badge')}
      </span>
    </article>
  );

  // Sidebar: 300x250 Medium Rectangle (IAB standard) — 6:5 image + text block.
  const sidebarCard = (
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

  const card = variant === 'featured' ? featuredCard : sidebarCard;

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
