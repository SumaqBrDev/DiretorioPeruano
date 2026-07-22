import { useParams, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { mockBusinesses, type Business } from '@/data/mockBusinesses';
import { getBusinesses } from '@/lib/localData';
import { StarRating } from '@/components/StarRating';
import { Breadcrumb } from '@/components/Breadcrumb';
import { PhotoGallery } from '@/components/PhotoGallery';
import { BusinessInfoCard } from '@/components/BusinessInfoCard';
import { AboutSection } from '@/components/AboutSection';
import { HoursSection } from '@/components/HoursSection';
import { ContactInfoSection } from '@/components/ContactInfoSection';
import { MenuSection } from '@/components/MenuSection';
import { ReviewsSection } from '@/components/ReviewsSection';
import { Sidebar } from '@/components/Sidebar';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';

// Minimal shape for a "registered" business from localStorage
interface LocalBizSummary {
  id: string;
  name: string;
  category: string;
  city: string;
  description: string;
  photos: string[];
  tags: string[];
  userId: string;
}

/**
 * Build a composite business object:
 * 1. Try localStorage first (real registered business)
 * 2. Fallback to mockBusinesses
 * 3. Merge where possible
 */
function findBusiness(id: string | number): Business {
  const strId = String(id);
  const numId = typeof id === 'number' ? id : parseInt(id, 10);

  // Try localStorage
  const localBizzes = getBusinesses();
  const local = localBizzes.find((b) => b.id === strId);

  // Try mockBusinesses
  const mock = mockBusinesses.find((b) => b.id === numId);

  if (local && mock) {
    // Merge: localStorage data overrides mock, but keep mock's rich data for missing fields
    return {
      ...mock,
      id: numId,
      name: local.name,
      category: local.category,
      city: `${local.address.city} - ${local.address.state}`,
      address: `${local.address.street}, ${local.address.city} - ${local.address.state}, ${local.address.zip}`,
      tags: local.tags?.length ? local.tags : mock.tags,
      about: local.description || mock.about,
      images: local.photos?.length ? local.photos : mock.images,
      reviewsCount: mock.reviewsCount,
      rating: mock.rating,
    };
  }

  if (local && !mock) {
    // Build a business-like object from localStorage data
    return {
      id: numId || parseInt(strId.replace(/\D/g, ''), 10) || 999,
      name: local.name,
      category: local.category,
      city: `${local.address.city} - ${local.address.state}`,
      address: `${local.address.street}, ${local.address.city} - ${local.address.state}, ${local.address.zip}`,
      rating: 4.5,
      reviewsCount: 0,
      tags: local.tags || [],
      about: local.description || '',
      images: local.photos || [],
      hours: [
        { day: 'Segunda', time: '08:00 - 18:00', isOpen: true },
        { day: 'Terça', time: '08:00 - 18:00', isOpen: true },
        { day: 'Quarta', time: '08:00 - 18:00', isOpen: true },
        { day: 'Quinta', time: '08:00 - 18:00', isOpen: true },
        { day: 'Sexta', time: '08:00 - 18:00', isOpen: true },
        { day: 'Sábado', time: '09:00 - 13:00', isOpen: true },
        { day: 'Domingo', time: 'Fechado', isOpen: false },
      ],
      phone: '',
      whatsapp: '',
      website: '',
      email: '',
      latitude: 0,
      longitude: 0,
      menu: [],
      reviews: [],
    };
  }

  // Fallback to mockBusinesses
  return mock || mockBusinesses[0];
}

export const Negocio = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user, isLoaded } = useUser();

  const business = useMemo(() => findBusiness(id || '1'), [id]);

  const hasGallery = business.images && business.images.length > 0;
  const tabs: Array<'sobre' | 'cardapio' | 'avaliacoes' | 'galeria'> = [
    'sobre',
    ...(business.menu?.length ? ['cardapio' as const] : []),
    ...(hasGallery ? ['galeria' as const] : []),
    'avaliacoes' as const,
  ];
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('sobre');

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
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
                    Cardápio
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
                <ReviewsSection business={business} />
              )}
            </div>
          </div>

          <Sidebar business={business} />
        </div>
      </div>
    </div>
  );
};
