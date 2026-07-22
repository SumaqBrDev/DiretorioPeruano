// src/components/PhotoGallery.tsx
// Photo gallery with fullscreen modal and keyboard navigation

import { useState, useEffect, useCallback } from 'react';
import { CaretLeft, CaretRight, X, ArrowLeft, ArrowRight } from '@phosphor-icons/react';

interface PhotoGalleryProps {
  images: string[];
  name: string;
}

export const PhotoGallery = ({ images, name }: PhotoGalleryProps) => {
  const [mainImage, setMainImage] = useState(images[0]);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalIndex, setModalIndex] = useState(0);

  // Open modal at a specific image index
  const openModal = (index: number) => {
    setModalIndex(index);
    setModalOpen(true);
  };

  const closeModal = () => setModalOpen(false);

  // Navigate modal
  const goPrev = useCallback(() => {
    setModalIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  const goNext = useCallback(() => {
    setModalIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  // Keyboard navigation
  useEffect(() => {
    if (!modalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') goPrev();
      if (e.key === 'ArrowRight') goNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    // Prevent body scroll while modal is open
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [modalOpen, goPrev, goNext]);

  // Reset main image when images change
  useEffect(() => {
    setMainImage(images[0]);
  }, [images]);

  if (!images || images.length === 0) return null;

  return (
    <>
      <section className="mb-10">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main image (clickable) */}
          <div className="lg:col-span-3">
            <button
              onClick={() => openModal(images.indexOf(mainImage))}
              className="relative aspect-video rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/10 w-full group cursor-zoom-in"
              aria-label="Abrir galeria"
            >
              <img
                src={mainImage}
                alt={`Foto principal de ${name}`}
                className="w-full h-full object-cover transition-all duration-500 group-hover:scale-105"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-noche-lima/30 via-transparent to-transparent" />

              {/* View gallery overlay */}
              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-noche-lima/40">
                <span className="bg-white/90 dark:bg-zinc-800/90 text-noche-lima dark:text-white px-5 py-2.5 rounded-xl font-semibold text-sm shadow-lg backdrop-blur-sm flex items-center gap-2">
                  <CaretRight size={16} />
                  Ver galeria ({images.length})
                </span>
              </div>
            </button>
          </div>

          {/* Thumbnails */}
          <div className="grid grid-cols-4 lg:grid-cols-1 gap-2">
            {images.map((image, index) => (
              <button
                key={index}
                onClick={() => {
                  setMainImage(image);
                  openModal(index);
                }}
                className={`relative aspect-video rounded-lg overflow-hidden ring-1 transition-all duration-300 ${
                  mainImage === images[index]
                    ? 'ring-2 ring-aji-rojo shadow-md'
                    : 'ring-black/5 dark:ring-white/10 hover:ring-aji-rojo/40 hover:shadow-sm'
                }`}
                aria-label={`Ver foto ${index + 1}`}
              >
                <img
                  src={images[index]}
                  alt={`Miniatura ${index + 1}`}
                  className={`w-full h-full object-cover transition-all duration-300 ${
                    mainImage !== images[index] ? 'brightness-90 hover:brightness-100' : ''
                  }`}
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=200&h=200&fit=crop';
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Fullscreen Modal ─────────────────────────────────── */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-[100] bg-noche-lima/95 dark:bg-black/95 flex items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Galeria de fotos"
        >
          {/* Close button */}
          <button
            onClick={closeModal}
            className="absolute top-4 right-4 z-10 w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
            aria-label="Fechar galeria"
          >
            <X size={24} weight="bold" />
          </button>

          {/* Counter */}
          <div className="absolute top-4 left-4 z-10 bg-white/10 backdrop-blur-sm text-white px-4 py-2 rounded-full text-sm font-medium">
            {modalIndex + 1} / {images.length}
          </div>

          {/* Previous button */}
          {images.length > 1 && (
            <button
              onClick={goPrev}
              className="absolute left-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Foto anterior"
            >
              <ArrowLeft size={28} weight="bold" />
            </button>
          )}

          {/* Modal image */}
          <div className="max-w-[90vw] max-h-[85vh] flex items-center justify-center">
            <img
              src={images[modalIndex]}
              alt={`${name} - foto ${modalIndex + 1}`}
              className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&h=800&fit=crop';
              }}
            />
          </div>

          {/* Next button */}
          {images.length > 1 && (
            <button
              onClick={goNext}
              className="absolute right-4 top-1/2 -translate-y-1/2 z-10 w-14 h-14 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
              aria-label="Próxima foto"
            >
              <ArrowRight size={28} weight="bold" />
            </button>
          )}

          {/* Thumbnail strip at bottom */}
          {images.length > 1 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2 max-w-[90vw] overflow-x-auto px-4 py-2">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setModalIndex(idx)}
                  className={`shrink-0 w-14 h-10 rounded-lg overflow-hidden ring-2 transition-all ${
                    idx === modalIndex
                      ? 'ring-aji-rojo opacity-100 scale-110'
                      : 'ring-white/30 opacity-60 hover:opacity-90'
                  }`}
                  aria-label={`Ir para foto ${idx + 1}`}
                >
                  <img
                    src={img}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
};
