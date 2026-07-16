import { useState } from 'react'

interface PhotoGalleryProps {
  images: string[];
  name: string;
}

export const PhotoGallery = ({ images, name }: { images: string[]; name: string }) => {
  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <section className="mb-12">
      <h2 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white mb-6">Fotos de {name}</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main image */}
        <div className="lg:col-span-3">
          <div className="relative aspect-video rounded-2xl overflow-hidden shadow-xl border-4 border-aji-rojo/20">
            <img
              src={mainImage}
              alt={`Foto principal de ${name}`}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&h=600&fit=crop';
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        </div>

        {/* Thumbnails */}
        <div className="grid grid-cols-4 lg:grid-cols-1 gap-2">
          {images.map((image, index) => (
            <button
              key={index}
              onClick={() => setMainImage(image)}
              className={`aspect-video rounded-xl overflow-hidden border-2 transition-all duration-300 ${mainImage === images[index] ? 'border-aji-rojo' : 'border-oro-inca/30 hover:border-aji-rojo/50'}`}
              aria-label={`Ver foto ${index + 1}`}
            >
              <img
                src={images[index]}
                alt={`Miniatura ${index + 1}`}
                className="w-full h-full object-cover"
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
}