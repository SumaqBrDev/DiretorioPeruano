// src/data/mockBusinesses.ts
// Mock business data with clean UTF-8 encoding

export interface BusinessHours {
  day: string;
  time: string;
  isOpen: boolean;
}

export interface MenuItem {
  name: string;
  price: string;
  description: string;
}

export interface MenuCategory {
  category: string;
  items: Array<{ name: string; price: string; description: string }>;
}

export interface Review {
  id: number;
  author: string;
  rating: number;
  date: string;
  text: string;
  tags: string[];
}

export interface Business {
  id: number;
  name: string;
  category: string;
  city: string;
  address: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
  about: string;
  images: string[];
  hours: Array<{ day: string; time: string; isOpen: boolean }>;
  phone: string;
  whatsapp: string;
  website: string;
  email: string;
  latitude: number;
  longitude: number;
  menu: Array<{
    category: string;
    items: Array<{ name: string; price: string; description: string }>;
  }>;
  reviews: Array<{
    id: number;
    author: string;
    rating: number;
    date: string;
    text: string;
    tags: string[];
  }>;
}

export const mockBusinesses = [
  {
    id: 1,
    name: 'El Ceviche de Lima',
    category: 'Restaurante',
    city: 'Sao Paulo - SP',
    address: 'Rua Augusta, 2500 - Consolacao, Sao Paulo - SP, 01305-000',
    rating: 4.9,
    reviewsCount: 234,
    tags: ['Ceviche Classico', 'Leche de Tigre', 'Chicha Morada', 'Mariscos Frescos'],
    about: 'Fundado em 2018 por chefs peruanos, El Ceviche de Lima traz os sabores autenticos da costa peruana para Sao Paulo. Nossos peixes sao importados diretamente do Peru e preparados com tecnicas tradicionais passadas de geracao em geracao. Especializados em ceviche, tiradito e pratos com mariscos frescos.',
    images: [
      'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1579952363873-27d3bfad9c0d?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=800&h=600&fit=crop',
    ],
    hours: [
      { day: 'Segunda', time: '11:00 - 22:00', isOpen: true },
      { day: 'Terca', time: '11:00 - 22:00', isOpen: true },
      { day: 'Quarta', time: '11:00 - 22:00', isOpen: true },
      { day: 'Quinta', time: '11:00 - 23:00', isOpen: true },
      { day: 'Sexta', time: '11:00 - 23:00', isOpen: true },
      { day: 'Sabado', time: '12:00 - 00:00', isOpen: true },
      { day: 'Domingo', time: '12:00 - 21:00', isOpen: true },
    ],
    phone: '+55 11 98765-4321',
    whatsapp: '+55 11 98765-4321',
    website: 'https://elceviche.com.br',
    email: 'contato@elceviche.com.br',
    latitude: -23.5614,
    longitude: -46.6558,
    menu: [
      { category: 'Ceviches', items: [
        { name: 'Ceviche Classico', price: 'R$ 89,90', description: 'File de robalo marinado em leche de tigre, cebola roxa, coentro e batata doce' },
        { name: 'Ceviche Mixto', price: 'R$ 119,90', description: 'File de robalo, camarao, lula e mexilhao em leche de tigre especial' },
        { name: 'Ceviche Nikkei', price: 'R$ 99,90', description: 'Salmao fresco com toque de gengibre, shoyu e limao siciliano' },
      ]},
      { category: 'Pratos Quentes', items: [
        { name: 'Lomo Saltado', price: 'R$ 79,90', description: 'File mignon salteado com cebola, tomate, batata frita e arroz' },
        { name: 'Aji de Gallina', price: 'R$ 69,90', description: 'Frango desfiado em molho cremoso de aji amarillo com azeitonas e ovos cozidos' },
        { name: 'Arroz con Mariscos', price: 'R$ 95,90', description: 'Arroz com camarao, lula, mexilhao e mariscos em molho de tomate e especiarias' },
      ]},
      { category: 'Bebidas', items: [
        { name: 'Chicha Morada', price: 'R$ 18,90', description: 'Bebida tradicional peruana de milho roxo com especiarias' },
        { name: 'Pisco Sour', price: 'R$ 35,90', description: 'Drink nacional do Peru com pisco, limao, acucar e clara de ovo' },
        { name: 'Inca Kola', price: 'R$ 12,90', description: 'Refrigerante peruano de sabor unico' },
      ]},
      { category: 'Sobremesas', items: [
        { name: 'Suspiro a la Limena', price: 'R$ 24,90', description: 'Doce de leite cremoso coberto com merengue' },
        { name: 'Alfajores', price: 'R$ 15,90', description: 'Biscoitos recheados com doce de leite' },
      ]},
    ],
    reviews: [
      { id: 1, author: 'Maria Gonzalez', rating: 5, date: '2024-01-15', text: 'Encontrei o melhor ceviche da minha vida! A leche de tigre e perfeita, igualzinha a de Lima. Me sinto em casa!', tags: ['Ceviche Classico', 'Leche de Tigre'] },
      { id: 2, author: 'Carlos Silva', rating: 5, date: '2024-02-20', text: 'O lomo saltado e incrivel! A carne e tenra e o molho e perfeito. Recomendo demais!', tags: ['Lomo Saltado'] },
      { id: 3, author: 'Ana Paula', rating: 4, date: '2024-03-10', text: 'Ambiente muito agradavel e comida deliciosa. Voltarei com certeza!', tags: ['Ceviche Mixto'] },
      { id: 4, author: 'Jose Martinez', rating: 5, date: '2024-04-05', text: 'Autentico sabor peruano! O pisco sour e o melhor que ja provei.', tags: ['Pisco Sour'] },
    ],
  },
  {
    id: 2,
    name: 'Sabor Andino',
    category: 'Restaurante',
    city: 'Rio de Janeiro - RJ',
    address: 'Rua Visconde de Piraja, 120 - Ipanema, Rio de Janeiro - RJ, 22410-003',
    rating: 4.8,
    reviewsCount: 189,
    tags: ['Lomo Saltado', 'Aji de Gallina', 'Pisco Sour', 'Causa Limena'],
    about: 'No coracao de Ipanema, o Sabor Andino oferece uma viagem gastronomica pelos Andes peruanos. Com ingredientes importados e receitas familiares, cada prato conta uma historia de tradicao e paixao.',
    images: [
      'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=800&h=600&fit=crop',
      'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=800&h=600&fit=crop',
    ],
    hours: [
      { day: 'Segunda', time: '12:00 - 23:00', isOpen: true },
      { day: 'Terca', time: '12:00 - 23:00', isOpen: true },
      { day: 'Quarta', time: '12:00 - 23:00', isOpen: true },
      { day: 'Quinta', time: '12:00 - 00:00', isOpen: true },
      { day: 'Sexta', time: '12:00 - 01:00', isOpen: true },
      { day: 'Sabado', time: '12:00 - 01:00', isOpen: true },
      { day: 'Domingo', time: '12:00 - 22:00', isOpen: true },
    ],
    phone: '+55 21 99876-5432',
    whatsapp: '+55 21 99876-5432',
    website: 'https://saborandino.com.br',
    email: 'reservas@saborandino.com.br',
    latitude: -22.9897,
    longitude: -43.2066,
    menu: [
      { category: 'Entradas', items: [
        { name: 'Causa Limena', price: 'R$ 45,90', description: 'Pure de batata amarela recheado com frango e avocado' },
      ]},
    ],
    reviews: [],
  },
];

export const mockBusinessesArray = mockBusinesses;