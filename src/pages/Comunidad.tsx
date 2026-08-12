// src/pages/Comunidad.tsx
// Comunidad — listado y búsqueda de temas (lectura pública; crear tema requiere sesión).
import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { listCommunityTopics, createCommunityTopic } from '@/lib/api';
import type { CommunityTopicListResult } from '@/lib/api';
import { SEO } from '@/components/SEO';
import { CommunityAds } from '@/components/CommunityAds';

export const Comunidad = () => {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CommunityTopicListResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New-topic form
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = await getToken().catch(() => null);
    setLoading(true);
    setError(null);
    try {
      const result = await listCommunityTopics(token, { q: q || undefined, page, limit: 10 });
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar a comunidade.');
    } finally {
      setLoading(false);
    }
  }, [getToken, q, page]);

  useEffect(() => {
    if (!isLoaded) return;
    refresh();
  }, [isLoaded, refresh]);

  const handleSearch = () => {
    setPage(1);
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    setSearchParams(params);
    refresh();
  };

  const handleCreateTopic = async () => {
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setSaveError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      const result = await createCommunityTopic(token, { title: title.trim(), body: body.trim() });
      setShowNewTopic(false);
      setTitle('');
      setBody('');
      refresh();
      // Navigate to the new topic
      window.location.href = `/comunidad/${result.topic.id}`;
    } catch (err: any) {
      setSaveError(err?.message || 'Erro ao criar o tema.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <SEO title={t('forum.title')} description={t('forum.subtitle')} />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-playfair text-3xl font-bold text-aji-rojo">{t('forum.title')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">{t('forum.subtitle')}</p>
        </div>
        {isSignedIn && (
          <button
            onClick={() => setShowNewTopic(!showNewTopic)}
            className="px-4 py-2 bg-aji-rojo hover:bg-aji-rojo/90 text-white rounded-lg font-medium transition-colors shrink-0"
          >
            {showNewTopic ? t('forum.cancel') : t('forum.newTopic')}
          </button>
        )}
      </div>

      {/* Featured ads (Opción B) — above the topic list, desktop + mobile */}
      <CommunityAds variant="featured" limit={2} />

      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
        <div className="min-w-0">
          {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={t('forum.searchPlaceholder')}
          className="flex-1 p-3 rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
        />
        <button
          onClick={handleSearch}
          className="px-5 py-3 bg-aji-rojo hover:bg-aji-rojo/90 text-white rounded-lg font-medium transition-colors"
        >
          {t('forum.search')}
        </button>
      </div>

      {/* New topic form */}
      {showNewTopic && (
        <div className="mb-6 p-5 rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima shadow-sm">
          <h2 className="font-playfair text-xl font-bold text-noche-lima dark:text-white mb-4">{t('forum.newTopicTitle')}</h2>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('forum.topicTitlePlaceholder')}
            maxLength={200}
            className="w-full p-3 mb-3 rounded-lg border border-oro-inca/30 bg-creme-andino dark:bg-zinc-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
          />
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={t('forum.topicBodyPlaceholder')}
            maxLength={5000}
            rows={4}
            className="w-full p-3 mb-3 rounded-lg border border-oro-inca/30 bg-creme-andino dark:bg-zinc-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo resize-y"
          />
          {saveError && <p className="text-red-600 dark:text-red-400 text-sm mb-3">{saveError}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">{body.length}/5000</span>
            <button
              onClick={handleCreateTopic}
              disabled={saving || !title.trim() || !body.trim()}
              className="px-5 py-2 bg-oro-inca hover:bg-oro-inca/90 text-noche-lima rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('forum.saving') : t('forum.publish')}
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-10">
          <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
          <button onClick={refresh} className="px-4 py-2 border border-oro-inca/40 rounded-lg hover:bg-oro-inca/10 transition-colors">
            {t('forum.retry')}
          </button>
        </div>
      ) : data && data.topics.length > 0 ? (
        <>
          <div className="space-y-3">
            {data.topics.map((topic) => (
              <Link
                key={topic.id}
                to={`/comunidad/${topic.id}`}
                className="block p-5 rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima hover:border-aji-rojo/50 hover:shadow-md transition-all"
              >
                <h3 className="font-semibold text-noche-lima dark:text-white text-lg">{topic.title}</h3>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                  <span>{t('forum.by')} {topic.author}</span>
                  <span>💬 {topic.postsCount} {t('forum.responses')}</span>
                  <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
                </div>
              </Link>
            ))}
          </div>
          {data.totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => { setPage((p) => Math.max(1, p - 1)); refresh(); }}
                disabled={page <= 1}
                className="px-4 py-2 border border-oro-inca/40 rounded-lg disabled:opacity-40 hover:bg-oro-inca/10 transition-colors"
              >
                ←
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-300">{page} / {data.totalPages}</span>
              <button
                onClick={() => { setPage((p) => Math.min(data.totalPages, p + 1)); refresh(); }}
                disabled={page >= data.totalPages}
                className="px-4 py-2 border border-oro-inca/40 rounded-lg disabled:opacity-40 hover:bg-oro-inca/10 transition-colors"
              >
                →
              </button>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-14">
          <p className="text-lg text-gray-500 dark:text-gray-400 mb-2">{t('forum.empty')}</p>
          {!isSignedIn && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('forum.loginToParticipate')}</p>
          )}
        </div>
      )}
        </div>

        {/* Sidebar ads (Opción A) — desktop only */}
        <CommunityAds variant="sidebar" limit={4} />
      </div>
    </div>
  );
};

export default Comunidad;
