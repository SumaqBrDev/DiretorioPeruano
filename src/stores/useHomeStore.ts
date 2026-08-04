import { create } from 'zustand';
import {
  getHomeCategories,
  getHomeFeatured,
  getHomeStats,
  getHomeTestimonials,
} from '../lib/api';

// The public read endpoints (categories/featured/stats/testimonials) do not
// require a Clerk token, so we call them with an empty token for consistency
// with the api.ts layer.
const PUBLIC_TOKEN = '';

export interface Category {
  slug: string;
  name: Record<string, string>;
  icon: string;
  count: number;
}

export interface FeaturedBusiness {
  id: string;
  name: string;
  category: string;
  city: string;
  state: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
  coverImage: string;
}

export interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

export interface Testimonial {
  id: string;
  author: string;
  city: string;
  rating: number;
  text: string;
  tags: string[];
  avatar?: string;
}

interface HomeState {
  categories: Category[];
  featuredBusinesses: FeaturedBusiness[];
  stats: Stat[];
  testimonials: Testimonial[];
  loading: {
    categories: boolean;
    featured: boolean;
    stats: boolean;
    testimonials: boolean;
  };
  error: {
    categories: string | null;
    featured: string | null;
    stats: string | null;
    testimonials: string | null;
  };
  fetchCategories: () => Promise<void>;
  fetchFeatured: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchTestimonials: () => Promise<void>;
}

export const useHomeStore = create<HomeState>((set) => ({
  categories: [],
  featuredBusinesses: [],
  stats: [],
  testimonials: [],
  loading: {
    categories: false,
    featured: false,
    stats: false,
    testimonials: false,
  },
  error: {
    categories: null,
    featured: null,
    stats: null,
    testimonials: null,
  },

  fetchCategories: async () => {
    set((s) => ({ loading: { ...s.loading, categories: true }, error: { ...s.error, categories: null } }));
    try {
      const data = await getHomeCategories(PUBLIC_TOKEN);
      set((s) => ({ categories: data as Category[], loading: { ...s.loading, categories: false } }));
    } catch (err: any) {
      set((s) => ({
        loading: { ...s.loading, categories: false },
        error: { ...s.error, categories: err?.message || 'Erro ao carregar categorias' },
      }));
    }
  },

  fetchFeatured: async () => {
    set((s) => ({ loading: { ...s.loading, featured: true }, error: { ...s.error, featured: null } }));
    try {
      const data = await getHomeFeatured(PUBLIC_TOKEN);
      set((s) => ({ featuredBusinesses: data as FeaturedBusiness[], loading: { ...s.loading, featured: false } }));
    } catch (err: any) {
      set((s) => ({
        loading: { ...s.loading, featured: false },
        error: { ...s.error, featured: err?.message || 'Erro ao carregar destaques' },
      }));
    }
  },

  fetchStats: async () => {
    set((s) => ({ loading: { ...s.loading, stats: true }, error: { ...s.error, stats: null } }));
    try {
      const data = await getHomeStats(PUBLIC_TOKEN);
      set((s) => ({ stats: data as Stat[], loading: { ...s.loading, stats: false } }));
    } catch (err: any) {
      set((s) => ({
        loading: { ...s.loading, stats: false },
        error: { ...s.error, stats: err?.message || 'Erro ao carregar estatísticas' },
      }));
    }
  },

  fetchTestimonials: async () => {
    set((s) => ({ loading: { ...s.loading, testimonials: true }, error: { ...s.error, testimonials: null } }));
    try {
      const data = await getHomeTestimonials(PUBLIC_TOKEN);
      set((s) => ({ testimonials: data as Testimonial[], loading: { ...s.loading, testimonials: false } }));
    } catch (err: any) {
      set((s) => ({
        loading: { ...s.loading, testimonials: false },
        error: { ...s.error, testimonials: err?.message || 'Erro ao carregar depoimentos' },
      }));
    }
  },
}));
