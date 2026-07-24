import { create } from 'zustand';
import axios from 'axios';
import { getBusinesses, getReviews } from '../lib/localData';

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

const API_BASE = import.meta.env.VITE_API_URL || '';

const apiGet = async (url: string) => {
  if (!API_BASE && !url.startsWith('http')) {
    throw new Error('No API base URL configured; using fallback');
  }
  const { data } = await axios.get(`${API_BASE}${url}`);
  return data;
};

/** Build featured businesses from localStorage */
function getLocalFeatured(): FeaturedBusiness[] {
  return getBusinesses()
    .filter(b => b.status === 'approved' || b.status === 'pending')
    .map(b => ({
      id: b.id,
      name: b.name,
      category: b.category,
      city: b.address.city,
      state: b.address.state,
      rating: 4.5,
      reviewsCount: getReviews(b.id).length,
      tags: b.tags || [],
      coverImage: b.photos?.[0] || '',
    }));
}

/** Build stats from localStorage */
function getLocalStats(): Stat[] {
  const businesses = getBusinesses();
  const total = businesses.length;
  const approved = businesses.filter(b => b.status === 'approved').length;
  const cities = new Set(businesses.map(b => b.address.city)).size;
  let totalReviews = 0;
  businesses.forEach(b => { totalReviews += getReviews(b.id).length; });

  return [
    { label: 'stats.businesses', value: total, suffix: '' },
    { label: 'stats.cities', value: cities, suffix: '' },
    { label: 'stats.reviews', value: totalReviews, suffix: '' },
    { label: 'stats.categories', value: 8, suffix: '' },
  ];
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
      const data = await apiGet('/api/categories');
      set((s) => ({ categories: data, loading: { ...s.loading, categories: false } }));
    } catch (err: any) {
      set((s) => ({
        loading: { ...s.loading, categories: false },
      }));
    }
  },

  fetchFeatured: async () => {
    set((s) => ({ loading: { ...s.loading, featured: true }, error: { ...s.error, featured: null } }));
    try {
      const data = await apiGet('/api/featured');
      set((s) => ({ featuredBusinesses: data, loading: { ...s.loading, featured: false } }));
    } catch (err: any) {
      // Fallback to localStorage data
      const localFeatured = getLocalFeatured();
      set((s) => ({
        featuredBusinesses: localFeatured,
        loading: { ...s.loading, featured: false },
      }));
    }
  },

  fetchStats: async () => {
    set((s) => ({ loading: { ...s.loading, stats: true }, error: { ...s.error, stats: null } }));
    try {
      const data = await apiGet('/api/stats');
      set((s) => ({ stats: data, loading: { ...s.loading, stats: false } }));
    } catch (err: any) {
      const localStats = getLocalStats();
      set((s) => ({
        stats: localStats,
        loading: { ...s.loading, stats: false },
      }));
    }
  },

  fetchTestimonials: async () => {
    set((s) => ({ loading: { ...s.loading, testimonials: true }, error: { ...s.error, testimonials: null } }));
    try {
      const data = await apiGet('/api/testimonials');
      set((s) => ({ testimonials: data, loading: { ...s.loading, testimonials: false } }));
    } catch (err: any) {
      set((s) => ({
        loading: { ...s.loading, testimonials: false },
      }));
    }
  },
}));