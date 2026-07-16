// src/pages/Home.tsx
import { Link } from 'react-router-dom'
import { useUser } from '@clerk/clerk-react'

export const Home = () => {
  const { user, isLoaded } = useUser()

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative min-h-[80vh] flex items-center justify-center bg-gradient-to-br from-creme-andino via-white to-oro-inca/10 dark:from-noche-lima dark:via-noche-lima dark:to-aji-rojo/10 overflow-hidden">
        {/* Animated textile pattern background */}
        <div className="absolute inset-0 opacity-5" aria-hidden="true">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="andean-pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <path d="M0 10 L20 10 M10 0 L10 20" stroke="#C0392B" strokeWidth="0.5" fill="none" opacity="0.3"/>
                <path d="M0 5 L20 5 M5 0 L5 20" stroke="#F39C12" strokeWidth="0.3" fill="none" opacity="0.2"/>
              </pattern>
              <rect width="100" height="100" fill="url(#andean-pattern)"/>
            </defs>
            <rect width="100%" height="100%" fill="url(#andean-pattern)"/>
          </svg>
        </div>

        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-aji-rojo/10 text-aji-rojo px-4 py-2 rounded-full text-sm font-medium mb-8 animate-fade-in-up">
              <span className="text-xl">🇵🇪</span>
              <span className="font-medium">Conectando Perú con Brasil</span>
              <span className="text-oro-inca">|</span>
              <span className="font-medium">Conectando Perú con Brasil</span>
            </div>

            {/* Main Headline */}
            <h1 className="font-playfair text-4xl md:text-5xl lg:text-6xl font-bold text-noche-lima dark:text-white mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <span className="text-aji-rojo">Sabor</span>Peruano
            </h1>
            <p className="text-xl md:text-2xl text-gray-700 dark:text-gray-300 mb-8 max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              O maior diretório de restaurantes peruanos e negócios da comunidade peruana no Brasil
            </p>

            {/* Search Bar */}
            <div className="max-w-2xl mx-auto animate-fade-in-up" style={{ animationDelay: '300ms' }}>
              <Link to="/busca" className="block">
                <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-2xl p-2 flex items-center gap-2 border border-oro-inca/20">
                  <span className="text-2xl ml-4">🔍</span>
                  <input
                    type="text"
                    placeholder="Buscar ceviche, lomo saltado, chicha morada..."
                    className="flex-1 bg-transparent placeholder-gray-500 dark:placeholder-gray-400 text-lg font-medium focus:outline-none"
                    readOnly
                  />
                  <span className="px-4 py-2 bg-aji-rojo text-white rounded-xl font-semibold text-lg shadow-lg">Buscar</span>
                </div>
              </Link>
              <p className="text-center text-gray-500 dark:text-gray-400 mt-4 text-sm">
                Ou <Link to="/busca" className="text-aji-rojo hover:underline font-medium">explore todas as categorias</Link>
              </p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12 animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="bg-white/80 dark:bg-noche-lima/80 backdrop-blur-sm rounded-xl p-6 border border-oro-inca/20">
                <p className="text-3xl md:text-4xl font-bold text-aji-rojo font-playfair">150+</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Restaurantes</p>
              </div>
              <div className="bg-white/80 dark:bg-noche-lima/80 backdrop-blur-sm rounded-xl p-6 border border-oro-inca/20">
                <p className="text-3xl md:text-4xl font-bold text-oro-inca font-playfair">12</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Cidades</p>
              </div>
              <div className="bg-white/80 dark:bg-noche-lima/80 backdrop-blur-sm rounded-xl p-6 border border-oro-inca/20">
                <p className="text-3xl md:text-4xl font-bold text-verde-brasil font-playfair">2.500+</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Avaliações</p>
              </div>
              <div className="bg-white/80 dark:bg-noche-lima/80 backdrop-blur-sm rounded-xl p-6 border border-oro-inca/20">
                <p className="text-3xl md:text-4xl font-bold text-aji-rojo font-playfair">50+</p>
                <p className="text-gray-600 dark:text-gray-400 mt-1">Tipos de Pratos</p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating decorative elements */}
        <div className="absolute bottom-10 left-10 w-20 h-20 opacity-10 animate-float" aria-hidden="true">
          <svg viewBox="0 0 100 100" className="w-full h-full text-aji-rojo">
            <path d="M50 10 Q70 10 70 30 Q70 50 50 50 Q30 50 30 30 Q30 10 50 10" fill="#C0392B"/>
            <ellipse cx="50" cy="30" rx="8" ry="6" fill="#F39C12"/>
          </svg>
        </div>
        <div className="absolute bottom-20 right-10 w-16 h-16 opacity-10 animate-float" style={{ animationDelay: '1s' }} aria-hidden="true">
          <svg viewBox="0 0 100 100" className="w-full h-full text-oro-inca">
            <circle cx="50" cy="50" r="20" fill="none" stroke="#F39C12" strokeWidth="3"/>
            <circle cx="50" cy="50" r="10" fill="#F39C12"/>
            <circle cx="50" cy="50" r="5" fill="#C0392B"/>
          </svg>
        </div>
      </section>

      {/* How it Works */}
      <section className="py-20 bg-white dark:bg-noche-lima">
        <div className="container mx-auto px-4">
          <header className="text-center mb-16">
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-4">
              Como funciona
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Encontre o sabor do Perú em 3 passos simples
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: '01', icon: '🔍', title: { 'pt-BR': 'Busque', 'es-PE': 'Busca' }, desc: { 'pt-BR': 'Digite o prato, restaurante ou cidade que procura', 'es-PE': 'Escribe el plato, restaurante o ciudad que buscas' } },
              { step: '02', icon: '📍', title: { 'pt-BR': 'Encontre', 'es-PE': 'Encuentra' }, desc: { 'pt-BR': 'Veja avaliações, fotos, cardápio e localização', 'es-PE': 'Ve reseñas, fotos, menú y ubicación' } },
              { step: '03', icon: '🤝', title: { 'pt-BR': 'Conecte', 'es-PE': 'Conecta' }, desc: { 'pt-BR': 'Avalie, comente e conecte-se com a comunidade', 'es-PE': 'Califica, comenta y conecta con la comunidad' } },
            ].map((item, i) => (
              <div key={i} className="text-center p-8 bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 hover:border-aji-rojo/50 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
                <div className="text-4xl mb-4 animate-bounce-slow">{item.icon}</div>
                <span className="text-xs font-bold text-aji-rojo uppercase tracking-wider">{item.step}</span>
                <h3 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mt-2 mb-2">{item.title['pt-BR']}</h3>
                <p className="text-gray-600 dark:text-gray-400">{item.desc['pt-BR']}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Categories */}
      <section className="py-20 bg-creme-andino dark:bg-noche-lima">
        <div className="container mx-auto px-4">
          <header className="text-center mb-16">
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-4">
              Categorias em Destaque
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Explore os sabores autênticos do Perú organizados por categoria
            </p>
          </header>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[
              { name: { 'pt-BR': 'Ceviches', 'es-PE': 'Ceviches' }, icon: '🐟', color: 'bg-blue-100 dark:bg-blue-900/30', count: '45+' },
              { name: { 'pt-BR': 'Pratos Quentes', 'es-PE': 'Platos Calientes' }, icon: '🍲', color: 'bg-red-100 dark:bg-red-900/30', count: '38+' },
              { name: { 'pt-BR': 'Bebidas', 'es-PE': 'Bebidas' }, icon: '🍹', color: 'bg-yellow-100 dark:bg-yellow-900/30', count: '22+' },
              { name: { 'pt-BR': 'Sobremesas', 'es-PE': 'Postres' }, icon: '🍰', color: 'bg-pink-100 dark:bg-pink-900/30', count: '18+' },
              { name: { 'pt-BR': 'Mercados', 'es-PE': 'Mercados' }, icon: '🛒', color: 'bg-green-100 dark:bg-green-900/30', count: '12+' },
              { name: { 'pt-BR': 'Serviços', 'es-PE': 'Servicios' }, icon: '🔧', color: 'bg-purple-100 dark:bg-purple-900/30', count: '8+' },
            ].map((cat, i) => (
              <Link
                key={i}
                to="/busca"
                className="group block p-6 bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 hover:border-aji-rojo/50 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center"
              >
                <div className={`${cat.color} w-16 h-16 rounded-xl flex items-center justify-center mx-auto mb-4 text-3xl transition-transform group-hover:scale-110`}>
                  {cat.icon}
                </div>
                <h3 className="font-semibold text-noche-lima dark:text-white mb-1">{cat.name['pt-BR']}</h3>
                <p className="text-sm text-aji-rojo font-medium">{cat.count} opções</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Restaurants */}
      <section className="py-20 bg-white dark:bg-noche-lima">
        <div className="container mx-auto px-4">
          <header className="flex items-center justify-between mb-12">
            <div>
              <h2 className="font-playfair text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-2">
                Restaurantes em Destaque
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Os mais bem avaliados pela comunidade
              </p>
            </div>
            <Link to="/busca" className="text-aji-rojo hover:underline font-medium hidden sm:block">
              Ver todos →
            </Link>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { name: 'El Ceviche de Lima', city: 'São Paulo - SP', rating: 4.9, reviews: 234, tags: ['Ceviche Clássico', 'Leche de Tigre', 'Chicha Morada'], image: '🐟' },
              { name: 'Sabor Andino', city: 'Rio de Janeiro - RJ', rating: 4.8, reviews: 189, tags: ['Lomo Saltado', 'Aji de Gallina', 'Pisco Sour'], image: '🍲' },
              { name: 'Pachamama', city: 'Brasília - DF', rating: 4.9, reviews: 156, tags: ['Causa Limeña', 'Anticuchos', 'Chicha Morada'], image: '🥔' },
              { name: 'El Pescador', city: 'Curitiba - PR', rating: 4.7, reviews: 134, tags: ['Ceviche Mixto', 'Arroz con Mariscos', 'Suspiro Limeño'], image: '🦐' },
              { name: 'Machu Picchu Restô', city: 'Belo Horizonte - MG', rating: 4.8, reviews: 201, tags: ['Lomo Saltado', 'Papa a la Huancaína', 'Chicha'], image: '🏔️' },
              { name: 'Inti Raymi', city: 'Porto Alegre - RS', rating: 4.6, reviews: 98, tags: ['Ceviche Nikkei', 'Tiradito', 'Chilcano'], image: '🎭' },
            ].map((rest, i) => (
              <Link key={i} to={`/negocio/${i+1}`} className="block">
                <article className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg overflow-hidden border border-oro-inca/20 hover:shadow-xl hover:border-aji-rojo/50 hover:-translate-y-1 transition-all duration-300">
                  <div className="relative aspect-video bg-gradient-to-br from-aji-rojo/20 to-oro-inca/20 flex items-center justify-center overflow-hidden">
                    <span className="text-6xl">{rest.image}</span>
                    <div className="absolute top-3 right-3">
                      <span className="bg-aji-rojo text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1">
                        <span>⭐</span> {rest.rating}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 bg-white/90 dark:bg-noche-lima/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs text-gray-600 dark:text-gray-400">
                      {rest.reviews} avaliações
                    </div>
                  </div>
                  <div className="p-5">
                    <h3 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-1">{rest.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 flex items-center gap-1">
                      <span>📍</span> {rest.city}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {rest.tags.map((tag, i) => (
                        <span key={i} className="bg-oro-inca/20 text-oro-inca px-3 py-1 rounded-full text-xs font-medium">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </Link>
            ))}
          </div>
          <div className="text-center mt-10">
            <Link to="/busca" className="inline-flex items-center gap-2 bg-aji-rojo text-white px-8 py-3 rounded-xl font-semibold text-lg hover:bg-aji-rojo/90 transition-all duration-300 hover:scale-105 shadow-lg">
              Ver todos os restaurantes
              <span>→</span>
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-creme-andino dark:bg-noche-lima">
        <div className="container mx-auto px-4">
          <header className="text-center mb-16">
            <h2 className="font-playfair text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-4">
              O que a comunidade diz
            </h2>
            <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Avaliações reais de peruanos e brasileiros que vivem a experiência SaborPeruano
            </p>
          </header>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { author: 'María González', city: 'São Paulo', rating: 5, text: 'Encontrei o melhor ceviche da minha vida no El Ceviche de Lima! A leche de tigre é perfeita, igualzinha à de Lima. Me sinto em casa!', tags: ['Ceviche Clássico', 'Leche de Tigre'] },
              { author: 'Carlos Silva', city: 'Rio de Janeiro', rating: 5, text: 'O Sabor Andino tem o melhor lomo saltado que já comi fora do Perú. A carne é tenra, o arroz soltinho e as batatas perfeitas. Recomendo demais!', tags: ['Lomo Saltado', 'Arroz Chaufa'] },
              { author: 'Ana Paula', city: 'Brasília', rating: 5, text: 'Finalmente achei chicha morada autêntica no Pachamama! E os anticuchos são de comer rezando. A comunidade peruana em Brasília tem um ponto de encontro!', tags: ['Chicha Morada', 'Anticuchos'] },
            ].map((testimonial, i) => (
              <article key={i} className="bg-white dark:bg-noche-lima rounded-2xl p-8 shadow-lg border border-oro-inca/20 hover:shadow-xl hover:border-aji-rojo/50 transition-all duration-300">
                <div className="flex items-center gap-1 mb-4">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <span key={star} className="text-oro-inca text-xl">⭐</span>
                  ))}
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-6 italic">"{testimonial.text}"</p>
                <div className="flex items-center gap-2 mb-4">
                  {testimonial.tags.map((tag, i) => (
                    <span key={i} className="bg-aji-rojo/10 text-aji-rojo px-2 py-1 rounded-full text-xs font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="border-t border-oro-inca/20 pt-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-aji-rojo to-oro-inca flex items-center justify-center text-white font-bold">
                    {testimonial.author.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-noche-lima dark:text-white">{testimonial.author}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{testimonial.city}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA for Business Owners */}
      <section className="py-20 bg-gradient-to-r from-aji-rojo via-aji-rojo/90 to-oro-inca">
        <div className="container mx-auto px-4 text-center">
          <h2 className="font-playfair text-3xl md:text-4xl font-bold text-white mb-4">
            Tem um negócio peruano no Brasil?
          </h2>
          <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
            Cadastre-se gratuitamente no SaborPeruano e conecte-se com a comunidade peruana no Brasil. Aumente sua visibilidade e alcance mais clientes.
          </p>
          <Link to="/onboarding" className="inline-flex items-center gap-2 bg-white text-aji-rojo px-8 py-3 rounded-xl font-semibold text-lg hover:bg-white/90 transition-all duration-300 hover:scale-105 shadow-xl">
            Cadastrar meu negócio grátis
            <span>→</span>
          </Link>
        </div>
      </section>
    </div>
  )
}