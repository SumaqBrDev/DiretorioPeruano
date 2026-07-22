import { Handler } from '@netlify/functions';
import prisma from './lib/prisma';

export const handler: Handler = async () => {
  try {
    const businesses = await prisma.businessProfile.findMany({
      where: { status: 'active' },
      select: { category: true },
    });

    const countMap = new Map<string, number>();
    businesses.forEach((b) => {
      const cat = b.category.toLowerCase();
      countMap.set(cat, (countMap.get(cat) || 0) + 1);
    });

    const categories = [
      { slug: 'restaurantes', name: { 'pt-BR': 'Restaurantes', 'es-PE': 'Restaurantes' }, icon: '🍽️', count: countMap.get('restaurante') || 0 },
      { slug: 'mercados', name: { 'pt-BR': 'Mercados', 'es-PE': 'Mercados' }, icon: '🛒', count: countMap.get('mercado') || 0 },
      { slug: 'salon', name: { 'pt-BR': 'Salões de Beleza', 'es-PE': 'Salones de Belleza' }, icon: '💇', count: countMap.get('salon') || 0 },
      { slug: 'servicios', name: { 'pt-BR': 'Serviços Profissionais', 'es-PE': 'Servicios Profesionales' }, icon: '💼', count: countMap.get('servicios') || 0 },
      { slug: 'salud', name: { 'pt-BR': 'Saúde', 'es-PE': 'Salud' }, icon: '🏥', count: countMap.get('salud') || 0 },
      { slug: 'juridico', name: { 'pt-BR': 'Jurídico', 'es-PE': 'Jurídico' }, icon: '⚖️', count: countMap.get('juridico') || 0 },
      { slug: 'financiero', name: { 'pt-BR': 'Financeiro', 'es-PE': 'Financiero' }, icon: '💰', count: countMap.get('financiero') || 0 },
      { slug: 'inmuebles', name: { 'pt-BR': 'Imóveis', 'es-PE': 'Inmuebles' }, icon: '🏠', count: countMap.get('inmuebles') || 0 },
    ];

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(categories),
    };
  } catch (error) {
    console.error('Error fetching categories:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to fetch categories' }),
    };
  }
};
