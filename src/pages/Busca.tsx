// src/pages/Busca.tsx
import { Link } from 'react-router-dom'
import { RestaurantCard } from '@/components/RestaurantCard'

export const Busca = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-12">
        <h1 className="font-playfair text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-4">
          Buscar Negócios
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          Encontre restaurantes peruanos, mercados e serviços da comunidade peruana no Brasil
        </p>
      </header>

      <div className="grid lg:grid-cols-4 gap-8">
        <aside className="lg:col-span-1">
          <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg p-6 border border-oro-inca/20 sticky top-24 space-y-6">
            <h3 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-4">Filtros</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Categoria</label>
                <select className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo">
                  <option value="">Todas as categorias</option>
                  <option value="restaurante">Restaurantes</option>
                  <option value="mercado">Mercados</option>
                  <option value="cafe">Cafés</option>
                  <option value="servicos">Serviços</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Cidade</label>
                <select className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo">
                  <option value="">Todas as cidades</option>
                  <option value="sao-paulo">São Paulo - SP</option>
                  <option value="rio-de-janeiro">Rio de Janeiro - RJ</option>
                  <option value="brasilia">Brasília - DF</option>
                  <option value="curitiba">Curitiba - PR</option>
                  <option value="belo-horizonte">Belo Horizonte - MG</option>
                  <option value="porto-alegre">Porto Alegre - RS</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Avaliação mínima</label>
                <select className="w-full p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo">
                  <option value="">Qualquer avaliação</option>
                  <option value="4.5">4.5+ estrelas</option>
                  <option value="4.0">4.0+ estrelas</option>
                  <option value="3.5">3.5+ estrelas</option>
                </select>
              </div>
            </div>
          </div>
        </aside>

        <main className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { id: 1, name: 'El Ceviche de Lima', city: 'São Paulo - SP', rating: 4.9, reviews: 234, tags: ['Ceviche Clássico', 'Leche de Tigre'], image: '🐟', category: 'Restaurante' },
              { id: 2, name: 'Sabor Andino', city: 'Rio de Janeiro - RJ', rating: 4.8, reviews: 189, tags: ['Lomo Saltado', 'Aji de Gallina'], image: '🍲', category: 'Restaurante' },
              { id: 3, name: 'Pachamama', city: 'Brasília - DF', rating: 4.9, reviews: 156, tags: ['Causa Limeña', 'Anticuchos'], image: '🥔', category: 'Restaurante' },
              { id: 4, name: 'El Pescador', city: 'Curitiba - PR', rating: 4.7, reviews: 134, tags: ['Ceviche Mixto', 'Arroz con Mariscos'], image: '🦐', category: 'Restaurante' },
              { id: 5, name: 'Machu Picchu Restô', city: 'Belo Horizonte - MG', rating: 4.8, reviews: 201, tags: ['Lomo Saltado', 'Papa a la Huancaína'], image: '🏔️', category: 'Restaurante' },
              { id: 6, name: 'Inti Raymi', city: 'Porto Alegre - RS', rating: 4.6, reviews: 98, tags: ['Ceviche Nikkei', 'Tiradito'], image: '🎭', category: 'Restaurante' },
              { id: 7, name: 'Mercado Inca', city: 'São Paulo - SP', rating: 4.8, reviews: 89, tags: ['Aji Amarillo', 'Rocoto', 'Choclo'], image: '🛒', category: 'Mercado' },
              { id: 8, name: 'Café Peruano', city: 'Rio de Janeiro - RJ', rating: 4.5, reviews: 67, tags: ['Café Peruano', 'Alfajores'], image: '☕', category: 'Café' },
              { id: 9, name: 'Salón de Belleza Inca', city: 'São Paulo - SP', rating: 4.6, reviews: 45, tags: ['Tratamientos Naturales', 'Henna'], image: '💆', category: 'Serviços' },
            ].map((item) => (
              <Link key={item.id} to={`/negocio/${item.id}`}>
                <RestaurantCard
                  name={item.name}
                  city={item.city}
                  rating={item.rating}
                  reviews={item.reviews}
                  tags={item.tags}
                  image={item.image}
                  category={item.category}
                />
              </Link>
            ))}
          </div>
        </main>
      </div>
    </div>
  )
}