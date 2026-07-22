import { useParams, Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
import { useState } from 'react';
import { mockBusinesses } from '@/data/mockBusinesses';
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

export const Negocio = () => {
  const { id } = useParams<{ id: string }>();
  const { user, isLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<'sobre' | 'cardapio' | 'avaliacoes'>('sobre');

  const businessId = parseInt(id || '1', 10);
  const business = mockBusinesses.find(b => b.id === businessId) || mockBusinesses[0];

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

            <div className="min-h-[400px]">
              {activeTab === 'sobre' && (
                <>
                  <AboutSection business={business} />
                  <HoursSection business={business} />
                  <ContactInfoSection business={business} />
                </>
              )}
              {activeTab === 'cardapio' && (
                <MenuSection business={business} />
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