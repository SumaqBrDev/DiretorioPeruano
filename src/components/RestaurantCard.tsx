// src/components/RestaurantCard.tsx
interface RestaurantCardProps {
  name: string
  city: string
  rating: number
  reviews: number
  tags: string[]
  image: string
  category: string
}

export const RestaurantCard = ({ name, city, rating, reviews, tags, image, category }: RestaurantCardProps) => {
  return (
    <article className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg overflow-hidden border border-oro-inca/20 hover:shadow-xl hover:border-aji-rojo/50 hover:-translate-y-1 transition-all duration-300">
      <div className="relative aspect-video bg-gradient-to-br from-aji-rojo/20 to-oro-inca/20 flex items-center justify-center overflow-hidden">
        <span className="text-6xl">{image}</span>
        <div className="absolute top-3 right-3">
          <span className="bg-aji-rojo text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
            <span>⭐</span> {rating}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-noche-lima/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-600 dark:text-gray-400">
          {Math.floor(Math.random() * 200 + 50)} avaliações
        </div>
        <div className="absolute top-3 left-3">
          <span className="bg-oro-inca/90 text-noche-lima px-2 py-1 rounded-full text-xs font-medium">
            {category}
          </span>
        </div>
      </div>
      <div className="p-5">
        <h3 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-1">
          {/* name will be passed as children from Link */}
        </h3>
        <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 flex items-center gap-1">
          <span>📍</span> São Paulo - SP
        </p>
        <div className="flex flex-wrap gap-2">
          <span className="bg-oro-inca/20 text-oro-inca px-3 py-1 rounded-full text-xs font-medium">#Ceviche</span>
          <span className="bg-aji-rojo/10 text-aji-rojo px-3 py-1 rounded-full text-xs font-medium">#Lomo</span>
        </div>
      </div>
    </article>
  )
}

export default RestaurantCard