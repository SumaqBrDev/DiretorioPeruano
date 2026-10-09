import { useParams, Link } from 'react-router-dom';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { getBusinessDetail, getReviewsForBusiness } from '@/lib/api';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PhotoGallery } from '@/components/PhotoGallery';
import { BusinessInfoCard } from '@/components/BusinessInfoCard';
import { AboutSection } from '@/components/AboutSection';
import { HoursSection } from '@/components/HoursSection';
import { ContactInfoSection } from '@/components/ContactInfoSection';
import { MenuSection } from '@/components/MenuSection';
import { ReviewsSection } from '@/components/ReviewsSection';
import { Sidebar } from '@/components/Sidebar';
import { CaretRight } from '@phosphor-icons/react';
import { analytics } from '@/lib/posthog';
import { mapApiBusinessDetailToDisplay, type DetailView } from '@/lib/negocioDisplay';

export const Negocio = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { isLoaded } = useUser();
  const { getToken } = useAuth();

  const [business, setBusiness] = useState<DetailView | null>(null);
  const [bizLoading, setBizLoading] = useState(true);
  const trackedBusinessIdRef = useRef<string | null>(null);

  const businessId = id || '';

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setBizLoading(true);
      try {
        const token = await getToken().catch(() => null);
        const detail = await getBusinessDetail(token || '', businessId);
        const reviews = await getReviewsForBusiness(token || '', businessId);
        if (cancelled) return;
        setBusiness(mapApiBusinessDetailToDisplay(detail, reviews));
      } catch (err: any) {
        if (!cancelled) {
          // 404 = not found / not approved
          setBusiness(null);
        }
      } finally {
        if (!cancelled) setBizLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businessId]);

  const hasGallery = Boolean(business?.images?.length);
  const tabs: Array<'sobre' | 'cardapio' | 'avaliacoes' | 'galeria'> = [
    'sobre',
    ...(business?.menu?.length ? ['cardapio' as const] : []),
    ...(hasGallery ? ['galeria' as const] : []),
    'avaliacoes' as const,
  ];
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('sobre');

  useEffect(() => {
    if (!business?.localId) return;
    if (trackedBusinessIdRef.current === business.localId) return;

    analytics.trackBusinessViewed({
      businessId: business.localId,
      category: business.category,
      hasGallery,
      reviewsCount: business.reviews.length,
    });
    trackedBusinessIdRef.current = business.localId;
  }, [business?.localId, business?.category, business?.reviews.length, hasGallery]);

  if (!isLoaded || bizLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h2 className="font-playfair text-2xl font-bold text-aji-rojo mb-4">Negócio não encontrado</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6">O negócio solicitado não existe ou foi removido.</p>
        <Link to="/busca" className="inline-flex items-center gap-2 bg-aji-rojo text-white px-6 py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-all">
          Voltar à Busca
          <CaretRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creme-andino dark:bg-zinc-950">
      <nav className="container mx-auto px-4 py-4" aria-label="Breadcrumb">
        <Breadcrumb name={business.name} />
      </nav>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 space-y-8">
            <PhotoGallery images={business.images} name={business.name} />
            <BusinessInfoCard business={business} />

            {/* Tabs */}
            <div className="mb-8">
              <div className="flex gap-1 border-b border-oro-inca/20 overflow-x-auto pb-1 -mx-4 px-4">
                <button
                  onClick={() => setActiveTab('sobre')}
                  className={`whitespace-nowrap pb-3 px-4 font-semibold transition-all duration-300 ${
                    activeTab === 'sobre'
                      ? 'text-aji-rojo border-b-2 border-aji-rojo'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-aji-rojo'
                  }`}
                >
                  Sobre
                </button>
                {business.menu?.length > 0 && (
                  <button
                    onClick={() => setActiveTab('cardapio')}
                    className={`whitespace-nowrap pb-3 px-4 font-semibold transition-all duration-300 ${
                      activeTab === 'cardapio'
                        ? 'text-aji-rojo border-b-2 border-aji-rojo'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-aji-rojo'
                    }`}
                  >
                    {t('nav.products_services')}
                  </button>
                )}
                {hasGallery && (
                  <button
                    onClick={() => setActiveTab('galeria')}
                    className={`whitespace-nowrap pb-3 px-4 font-semibold transition-all duration-300 ${
                      activeTab === 'galeria'
                        ? 'text-aji-rojo border-b-2 border-aji-rojo'
                        : 'text-zinc-600 dark:text-zinc-400 hover:text-aji-rojo'
                    }`}
                  >
                    Galeria {hasGallery ? `(${business.images.length})` : ''}
                  </button>
                )}
                <button
                  onClick={() => setActiveTab('avaliacoes')}
                  className={`whitespace-nowrap pb-3 px-4 font-semibold transition-all duration-300 ${
                    activeTab === 'avaliacoes'
                      ? 'text-aji-rojo border-b-2 border-aji-rojo'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-aji-rojo'
                  }`}
                >
                  Avaliações ({business.reviews.length})
                </button>
              </div>
            </div>

            {/* Tab Content */}
            <div className="min-h-[400px]">
              {activeTab === 'sobre' && (
                <>
                  <AboutSection business={business} />
                  <HoursSection business={business} />
                  <ContactInfoSection business={business} />
                </>
              )}
              {activeTab === 'cardapio' && business.menu?.length > 0 && (
                <MenuSection business={business} />
              )}
              {activeTab === 'galeria' && hasGallery && (
                <section className="mb-12">
                  <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-8 border border-oro-inca/20">
                    <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-6">
                      Galeria de Fotos
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      {business.images.map((img, idx) => (
                        <a
                          key={idx}
                          href={img}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block aspect-video rounded-xl overflow-hidden ring-1 ring-black/5 dark:ring-white/10 hover:ring-2 hover:ring-aji-rojo/50 transition-all hover:scale-[1.02]"
                        >
                          <img
                            src={img}
                            alt={`${business.name} - foto ${idx + 1}`}
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </a>
                      ))}
                    </div>
                  </div>
                </section>
              )}
              {activeTab === 'avaliacoes' && (
                <ReviewsSection business={business} localBusinessId={business.localId} />
              )}
            </div>
          </div>

          <Sidebar business={business} />
        </div>
      </div>
    </div>
  );
};