// src/data/seedData.ts
// Datos de prueba reales — se insertan en localStorage al primer cargue
// Para usar en desarrollo/demo. En producción NO se ejecutan.

import { saveBusiness, saveReview, getBusinesses, seedB2BData } from '@/lib/localData'

// CNPJs válidos de ejemplo (formato brasileño: XX.XXX.XXX/XXXX-XX)
const SEED_BUSINESSES = [
  {
    name: 'El Ceviche de Lima',
    description: 'Fundado em 2018 por chefs peruanos, El Ceviche de Lima traz os sabores autenticos da costa peruana para Sao Paulo. Nossos peixes sao importados diretamente do Peru e preparados com tecnicas tradicionais passadas de geracao em geracao. Especializados em ceviche, tiradito e pratos com mariscos frescos.',
    cnpj: '12345678000195',
    ownerFullName: 'Carlos Mendoza',
    ownerBirthCity: 'Lima',
    category: 'restaurante',
    address: {
      street: 'Rua Augusta, 2500',
      city: 'São Paulo',
      state: 'SP',
      zip: '01305-000',
    },
    tags: ['Ceviche Clássico', 'Leche de Tigre', 'Chicha Morada', 'Mariscos Frescos'],
    photos: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=800&h=600&fit=crop',
    ],
    userId: 'seed-user-1',
    status: 'approved',
    subscriptionStatus: 'trial',
    trialEndsAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: 'Sabor Andino',
    description: 'No coracao de Ipanema, o Sabor Andino oferece uma viagem gastronomica pelos Andes peruanos. Com ingredientes importados e receitas familiares, cada prato conta uma historia de tradicao e paixao.',
    cnpj: '23456789000187',
    ownerFullName: 'Maria Quispe',
    ownerBirthCity: 'Cusco',
    category: 'restaurante',
    address: {
      street: 'Rua Visconde de Piraja, 120',
      city: 'Rio de Janeiro',
      state: 'RJ',
      zip: '22410-003',
    },
    tags: ['Lomo Saltado', 'Aji de Gallina', 'Pisco Sour', 'Causa Limena'],
    photos: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop',
    ],
    userId: 'seed-user-2',
    status: 'approved',
    subscriptionStatus: 'active',
    approvedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: 'Pachamama',
    description: 'Autentica cozinha andina no coração de Brasília. Trazemos os sabores da Pachamama (Mãe Terra) para sua mesa com ingredientes orgânicos e receitas ancestrais.',
    cnpj: '34567890000179',
    ownerFullName: 'Juan Poma',
    ownerBirthCity: 'Arequipa',
    category: 'restaurante',
    address: {
      street: 'SHIS QI 11, Bloco A',
      city: 'Brasília',
      state: 'DF',
      zip: '71625-110',
    },
    tags: ['Causa Limeña', 'Anticuchos', 'Chicha Morada'],
    photos: [
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop',
    ],
    userId: 'seed-user-3',
    status: 'approved',
    subscriptionStatus: 'trial',
    trialEndsAt: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: 'El Pescador',
    description: 'Especialistas em frutos do mar frescos com toque peruano. Ceviches, tiraditos e arroces com mariscos preparados na hora.',
    cnpj: '45678901000161',
    ownerFullName: 'Pedro Huanca',
    ownerBirthCity: 'Piura',
    category: 'restaurante',
    address: {
      street: 'Rua Marechal Deodoro, 500',
      city: 'Curitiba',
      state: 'PR',
      zip: '80020-010',
    },
    tags: ['Ceviche Mixto', 'Arroz con Mariscos', 'Suspiro Limeño'],
    photos: [
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop',
    ],
    userId: 'seed-user-4',
    status: 'approved',
    subscriptionStatus: 'active',
    approvedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: 'Machu Picchu Restô',
    description: 'Ambiente aconchegante com decoração inspirada na cidadela inca. Pratos tradicionais peruanos com apresentação moderna.',
    cnpj: '56789012000153',
    ownerFullName: 'Ana Condori',
    ownerBirthCity: 'Cusco',
    category: 'restaurante',
    address: {
      street: 'Avenida Afonso Pena, 1200',
      city: 'Belo Horizonte',
      state: 'MG',
      zip: '30130-009',
    },
    tags: ['Lomo Saltado', 'Papa a la Huancaína', 'Chicha'],
    photos: [
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
    ],
    userId: 'seed-user-5',
    status: 'approved',
    subscriptionStatus: 'trial',
    trialEndsAt: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString(),
    approvedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    name: 'Mercado Inca',
    description: 'Produtos peruanos autenticos: aji amarillo, aji panca, rocoto, choclo, lucuma, quinoa e muito mais. Importação direta do Peru.',
    cnpj: '67890123000145',
    ownerFullName: 'Luis Inca',
    ownerBirthCity: 'Lima',
    category: 'mercado',
    address: {
      street: 'Rua 25 de Março, 800',
      city: 'São Paulo',
      state: 'SP',
      zip: '01021-300',
    },
    tags: ['Aji Amarillo', 'Rocoto', 'Choclo', 'Lucuma', 'Quinoa'],
    photos: [
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800&h=600&fit=crop',
    ],
    userId: 'seed-user-6',
    status: 'approved',
    subscriptionStatus: 'active',
    approvedAt: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
  },
]

// Reseñas de prueba
const SEED_REVIEWS = [
  { businessName: 'El Ceviche de Lima', author: 'María González', rating: 5, text: 'Encontrei o melhor ceviche da minha vida! A leche de tigre e perfeita, igualzinha a de Lima. Me sinto em casa!' },
  { businessName: 'El Ceviche de Lima', author: 'Carlos Silva', rating: 5, text: 'O lomo saltado e incrivel! A carne e tenra e o molho e perfeito. Recomendo demais!' },
  { businessName: 'El Ceviche de Lima', author: 'Ana Paula', rating: 4, text: 'Ambiente muito agradavel e comida deliciosa. Voltarei com certeza!' },
  { businessName: 'El Ceviche de Lima', author: 'Jose Martinez', rating: 5, text: 'Autentico sabor peruano! O pisco sour e o melhor que ja provei.' },
  { businessName: 'Sabor Andino', author: 'Carlos Silva', rating: 5, text: 'O Sabor Andino tem o melhor lomo saltado que ja comi fora do Perú. A carne e tenra, o arroz soltinho e as batatas perfeitas.' },
  { businessName: 'Pachamama', author: 'Ana Paula', rating: 5, text: 'Finalmente achei chicha morada autentica no Pachamama! E os anticuchos sao de comer rezando. A comunidade peruana tem um ponto de encontro!' },
  { businessName: 'Mercado Inca', author: 'Roberto Lima', rating: 5, text: 'Finalmente encontrei aji amarillo fresco e rocoto de verdade! O atendimento e excelente, explicam como usar cada ingrediente.' },
  { businessName: 'El Pescador', author: 'Lucia Santos', rating: 5, text: 'O ceviche mixto e divino! Peixe fresquissimo, leche de tigre no ponto. Melhor ceviche de Curitiba!' },
  { businessName: 'Machu Picchu Restô', author: 'Fernando Costa', rating: 5, text: 'Ambiente lindo, atendimento impecavel. O lomo saltado veio perfeito, batatas crocantes por fora e macias por dentro.' },
]

export function seedTestData(): void {
  // Solo ejecutar si localStorage está vacío
  const existing = getBusinesses()
  if (existing.length > 0) {
    console.log('[seedTestData] Datos já existem, pulando seed')
    return
  }

  console.log('[seedTestData] Inserindo dados de teste...')

  // Guardar negocios
  const savedBusinesses = SEED_BUSINESSES.map(b => saveBusiness(b))

  // Mapear nombre -> id para reseñas
  const nameToId = new Map(savedBusinesses.map(b => [b.name, b.id]))

  // Guardar reseñas
  SEED_REVIEWS.forEach(r => {
    const businessId = nameToId.get(r.businessName)
    if (businessId) {
      saveReview(businessId, {
        author: r.author,
        rating: r.rating,
        text: r.text,
        userId: 'seed-review-user',
      })
    }
  })

  // Seed B2B conversations
  const nameToB2BId = new Map(savedBusinesses.map(b => [b.name, b.id]))
  seedB2BData(nameToB2BId)

  console.log(`[seedTestData] ✅ ${savedBusinesses.length} negócios, ${SEED_REVIEWS.length} resenhas e B2B seed inseridos`)
}