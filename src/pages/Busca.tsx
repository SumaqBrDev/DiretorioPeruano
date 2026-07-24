import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MagnifyingGlass, Star, Funnel } from '@phosphor-icons/react';
import axios from 'axios';
import { SkeletonCard } from '../components/SkeletonCard';
import { getBusinesses, getReviews } from '../lib/localData';

interface SearchResult {
  id: string;
  name: string;
  category: string;
  city: string;
  state: string;
  rating: number;
  reviewsCount: number;
  tags: string[];
  coverImage: string;
  description: string;
}

const API_BASE = import.meta.env.VITE_API_URL || '';

const CATEGORIES = [
  { value: '', labelKey: 'search.all_categories' },
  { value: 'restaurante', label: 'Restaurantes' },
  { value: 'mercado', label: 'Mercados' },
  { value: 'salon', label: 'Salões de Beleza' },
  { value: 'servicios', label: 'Serviços Profissionais' },
  { value: 'salud', label: 'Saúde' },
  { value: 'juridico', label: 'Jurídico' },
  { value: 'financiero', label: 'Financeiro' },
  { value: 'inmuebles', label: 'Imóveis' },
];

const CITIES = [
  { value: '', label: 'Todas as cidades' },
  { value: 'sao paulo', label: 'São Paulo - SP' },
  { value: 'rio de janeiro', label: 'Rio de Janeiro - RJ' },
  { value: 'brasilia', label: 'Brasília - DF' },
  { value: 'curitiba', label: 'Curitiba - PR' },
  { value: 'belo horizonte', label: 'Belo Horizonte - MG' },
  { value: 'porto alegre', label: 'Porto Alegre - RS' },
  { value: 'salvador', label: 'Salvador - BA' },
  { value: 'fortaleza', label: 'Fortaleza - CE' },
  { value: 'recife', label: 'Recife - PE' },
  { value: 'manaus', label: 'Manaus - AM' },
  { value: 'florianopolis', label: 'Florianópolis - SC' },
  { value: 'goiania', label: 'Goiânia - GO' },
];

const RATINGS = [
  { value: '', label: 'Qualquer avaliação' },
  { value: '4.5', label: '4.5+ estrelas' },
  { value: '4.0', label: '4.0+ estrelas' },
  { value: '3.5', label: '3.5+ estrelas' },
];

/** Normalize a city string for comparison */
const normalizeCity = (city: string) =>
  city.toLowerCase().replace(/[^a-záéíóúãõâêîôûà0-9\s]/g, '').trim();

/** Normalize text for search matching */
const normalizeText = (text: string) =>
  text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();

/** Build fallback results from localStorage only */
function getLocalFallbackResults(): SearchResult[] {
  const localBizzes = getBusinesses();
  return localBizzes.map((b) => ({
    id: b.id,
    name: b.name,
    category: b.category,
    city: b.address.city,
    state: b.address.state,
    rating: 4.5,
    reviewsCount: getReviews(b.id).length,
    tags: b.tags || [],
    coverImage: b.photos?.[0] || '',
    description: b.description || '',
  }));
}

export const Busca = () => {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [results, setResults] = useState<SearchResult[]>(() => getLocalFallbackResults());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Read URL params using the CORRECT keys: q, category, city, rating
  const query = searchParams.get('q') || '';
  const category = searchParams.get('category') || '';
  const city = searchParams.get('city') || '';
  const minRating = searchParams.get('rating') || '';

  const [searchInput, setSearchInput] = useState(query);

  // ── Filtering logic ──────────────────────────────────────────

  const filteredResults = useMemo(() => {
    let filtered = [...results];

    // Text search (fuzzy match on name, tags, city)
    if (searchInput.trim()) {
      const q = normalizeText(searchInput);
      filtered = filtered.filter((item) => {
        const name = normalizeText(item.name);
        const tags = item.tags.map((t) => normalizeText(t)).join(' ');
        const cityText = normalizeText(item.city);
        const stateText = normalizeText(item.state || '');
        const haystack = `${name} ${tags} ${cityText} ${stateText}`;
        return haystack.includes(q);
      });
    }

    // Category filter
    if (category) {
      filtered = filtered.filter(
        (item) => item.category.toLowerCase() === category.toLowerCase()
      );
    }

    // City filter
    if (city) {
      const nc = normalizeCity(city);
      filtered = filtered.filter((item) => {
        const itemCity = normalizeCity(item.city);
        const full = normalizeCity(`${item.city} ${item.state || ''}`);
        return itemCity.includes(nc) || full.includes(nc);
      });
    }

    // Rating filter
    if (minRating) {
      const min = parseFloat(minRating);
      filtered = filtered.filter((item) => item.rating >= min);
    }

    return filtered;
  }, [results, searchInput, category, city, minRating]);

  // ── Fetch from API (if configured) ────────────────────────────

  const fetchResults = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (category) params.set('category', category);
      if (city) params.set('city', city);
      if (minRating) params.set('minRating', minRating);

      const { data } = await axios.get(`${API_BASE}/api/businesses?${params.toString()}`);
      setResults(data);
    } catch (err: any) {
      if (err?.message?.includes('No API base URL') || err?.code === 'ERR_NETWORK') {
        // Already populated by local fallback — keep it
      } else {
        setError(err?.message || 'Erro ao buscar resultados');
        setResults([]);
      }
    } finally {
      setLoading(false);
    }
  }, [query, category, city, minRating]);

  useEffect(() => {
    if (!API_BASE) return;
    fetchResults();
  }, [fetchResults]);

  // ── Handle Search form submit ─────────────────────────────────

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchInput.trim()) params.set('q', searchInput.trim());
    if (category) params.set('category', category);
    if (city) params.set('city', city);
    if (minRating) params.set('rating', minRating);
    setSearchParams(params);
  };

  // ── Update filter (syncs to URL) ──────────────────────────────

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value) {
      // Keep search query if present
      if (searchInput.trim()) params.set('q', searchInput.trim());
      params.set(key, value);
    } else {
      params.delete(key);
    }
    setSearchParams(params, { replace: true });
  };

  const getCategoryBadge = (cat: string) => {
    const c = cat.toLowerCase();
    if (c === 'restaurante') return 'bg-aji-rojo/10 text-aji-rojo';
    if (c === 'mercado') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
    if (c === 'salon') return 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400';
    if (c === 'servicios') return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
    if (c === 'salud') return 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400';
    return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  };

  const hasFilters = !!(query || category || city || minRating);

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-noche-lima dark:text-white mb-2 tracking-tighter">
          {t('search.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 max-w-2xl">
          {t('search.subtitle')}
        </p>
      </header>

      {/* Search Bar (real-time filtering) */}
      <form onSubmit={handleSearch} className="mb-8">
        <div className="flex items-center gap-2 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-2 border border-oro-inca/20 focus-within:border-aji-rojo/50 focus-within:ring-2 focus-within:ring-aji-rojo/20 transition-all">
          <MagnifyingGlass size={22} className="ml-3 text-gray-400 shrink-0" />
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('search.search_placeholder')}
            className="flex-1 bg-transparent placeholder-gray-400 dark:placeholder-gray-500 text-base focus:outline-none text-noche-lima dark:text-white"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-aji-rojo text-white rounded-xl font-semibold text-sm hover:bg-aji-rojo/90 active:scale-[0.98] transition-all shrink-0"
          >
            {t('hero.search_button')}
          </button>
          {/* Mobile filter toggle */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
            className="md:hidden p-2.5 text-gray-500 hover:text-aji-rojo rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-700 transition-colors"
            aria-label={t('search.filters')}
          >
            <Funnel size={20} />
          </button>
        </div>
      </form>

      {/* API not configured notice */}
      {!API_BASE && (
        <div className="mb-6 p-4 bg-oro-inca/10 border border-oro-inca/30 rounded-xl text-center">
          <p className="text-oro-inca text-sm font-medium">
            Modo de desenvolvimento — exibindo dados locais
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-4 gap-8">
        {/* Filters Sidebar */}
        <aside className={`lg:col-span-1 ${mobileFiltersOpen ? 'block' : 'hidden md:block'}`}>
          <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg p-6 border border-oro-inca/20 sticky top-24 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-noche-lima dark:text-white">
                {t('search.filters')}
              </h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="md:hidden text-gray-400 hover:text-aji-rojo"
                aria-label="Fechar filtros"
              >
                &times;
              </button>
            </div>

            {/* Category Filter — correct key 'category' */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('search.category')}
              </label>
              <select
                value={category}
                onChange={(e) => updateFilter('category', e.target.value)}
                className="w-full p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo/30 focus:border-aji-rojo/50 transition-all text-sm"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label || t(cat.labelKey || '')}
                  </option>
                ))}
              </select>
            </div>

            {/* City Filter — correct key 'city' */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('search.city')}
              </label>
              <select
                value={city}
                onChange={(e) => updateFilter('city', e.target.value)}
                className="w-full p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo/30 focus:border-aji-rojo/50 transition-all text-sm"
              >
                {CITIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Rating Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('search.rating')}
              </label>
              <select
                value={minRating}
                onChange={(e) => updateFilter('rating', e.target.value)}
                className="w-full p-3 rounded-xl border border-oro-inca/30 bg-white dark:bg-zinc-800 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo/30 focus:border-aji-rojo/50 transition-all text-sm"
              >
                {RATINGS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Active Filters Summary */}
            {hasFilters && (
              <div className="pt-4 border-t border-oro-inca/20">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                  {filteredResults.length} {t('search.results')}
                </p>
                <button
                  onClick={() => {
                    setSearchInput('');
                    setSearchParams({});
                  }}
                  className="text-xs text-aji-rojo font-medium hover:underline"
                >
                  Limpar filtros
                </button>
              </div>
            )}
          </div>
        </aside>

        {/* Results */}
        <main className="lg:col-span-3">
          {error && (
            <div className="mb-6 p-4 bg-aji-rojo/10 border border-aji-rojo/30 rounded-xl text-center">
              <p className="text-aji-rojo text-sm">{t('common.error')}: {error}</p>
              <button
                onClick={fetchResults}
                className="mt-2 text-sm text-aji-rojo font-medium hover:underline"
              >
                {t('common.retry')}
              </button>
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} variant="card" />
              ))}
            </div>
          ) : filteredResults.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredResults.map((item) => (
                <Link
                  key={item.id}
                  to={`/negocio/${item.id}`}
                  className="block group"
                >
                  <article className="bg-white dark:bg-zinc-800 rounded-2xl shadow-lg overflow-hidden border border-oro-inca/20 hover:shadow-xl hover:border-aji-rojo/50 hover:-translate-y-1 transition-all duration-300">
                    <div className="relative aspect-video bg-gradient-to-br from-aji-rojo/20 to-oro-inca/20 flex items-center justify-center overflow-hidden">
                      {item.coverImage ? (
                        <img
                          src={item.coverImage}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          loading="lazy"
                        />
                      ) : (
                        <span className="text-5xl opacity-40">
                          {item.category === 'Restaurante' || item.category === 'restaurante' ? '🍽️' : item.category === 'Mercado' ? '🛒' : '🏪'}
                        </span>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className="bg-aji-rojo text-white px-3 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                          <Star size={14} weight="fill" />
                          {item.rating || '-'}
                        </span>
                      </div>
                      <div className="absolute top-3 left-3">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium shadow-sm ${getCategoryBadge(item.category)}`}>
                          {item.category}
                        </span>
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-noche-lima dark:text-white mb-1 group-hover:text-aji-rojo transition-colors">
                        {item.name}
                      </h3>
                      <p className="text-gray-500 dark:text-gray-400 text-sm mb-3 flex items-center gap-1">
                        <span className="text-base">📍</span>
                        {item.city}{item.state ? ` - ${item.state}` : ''}
                      </p>
                      {item.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {item.tags.slice(0, 3).map((tag: string, i: number) => (
                            <span
                              key={i}
                              className="bg-oro-inca/20 text-oro-inca dark:text-oro-inca/80 px-3 py-1 rounded-full text-xs font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-zinc-800 rounded-2xl border border-oro-inca/20">
              <p className="text-gray-500 dark:text-gray-400 text-lg mb-2">
                {t('search.no_results')}
              </p>
              <p className="text-gray-400 dark:text-gray-500 text-sm mb-6">
                {t('search.try_adjusting')}
              </p>
              <Link
                to="/onboarding"
                className="inline-flex items-center gap-2 bg-aji-rojo text-white px-6 py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 transition-all"
              >
                {t('featured.register')}
                <span>&rarr;</span>
              </Link>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};
