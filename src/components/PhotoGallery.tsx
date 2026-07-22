import { useState } from 'react'

interface PhotoGalleryProps {
  images: string[];
  name: string;
}

export const PhotoGallery = ({ images, name }: PhotoGalleryProps) => {
  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <section className="mb-10">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main image */}
        <div className="lg:col-span-3">
          <div className="relative aspect-video rounded-xl overflow-hidden shadow-lg ring-1 ring-black/5 dark:ring-white/10">
            <img
              src={mainImage}
              alt={`Foto principal de ${name}`}
              className="w-full h-full object-cover transition-all duration-500"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-noche-lima/30 via-transparent to-transparent" />
          </div>
        </div>

        {/* Thumbnails */}
        <div className="grid grid-cols-4 lg:grid-cols-1 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setMainImage(image)}
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
  );
};
