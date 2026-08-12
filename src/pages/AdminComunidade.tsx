// src/pages/AdminComunidade.tsx
// Moderación de la Comunidad (superadmin): cola de reportados y contenido
// oculto/eliminado — ocultar, restaurar, eliminar temas y mensajes.
import { useCallback, useEffect, useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { getCommunityModerationQueue, moderateCommunityContent } from '@/lib/api';
import type { CommunityModerationQueue } from '@/lib/api';
import { SEO } from '@/components/SEO';
import { showToast } from '@/lib/toast';

const SUPERADMIN_CLERK_ID = 'user_3GsBXtg23VQOhHPN3HCF1oCN4Eq';

export const AdminComunidade = () => {
  const { t } = useTranslation();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const [queue, setQueue] = useState<CommunityModerationQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scope, setScope] = useState<'reported' | 'all'>('reported');
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const token = await getToken().catch(() => null);
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getCommunityModerationQueue(token, scope);
      setQueue(result);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar a fila de moderação.');
    } finally {
      setLoading(false);
    }
  }, [getToken, scope]);

  useEffect(() => {
    if (isLoaded && user?.id === SUPERADMIN_CLERK_ID) refresh();
  }, [isLoaded, user, refresh]);

  const moderate = async (targetType: 'topic' | 'post', targetId: string, action: 'hide' | 'restore' | 'delete') => {
    setPendingAction(`${targetType}:${targetId}:${action}`);
    try {
      const token = await getToken();
      if (!token) return;
      await moderateCommunityContent(token, { targetType, targetId, action });
      refresh();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao moderar conteúdo.', 'error');
    } finally {
      setPendingAction(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
      </div>
    );
  }

  if (!user || user.id !== SUPERADMIN_CLERK_ID) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <p className="text-xl text-aji-rojo font-medium">❌ Acesso negado</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <SEO title="Moderação da Comunidade" description="Fila de moderação da comunidade ConectaPeru" />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="font-playfair text-3xl font-bold text-aji-rojo">🛡️ Moderação da Comunidade</h1>
        <div className="flex rounded-lg overflow-hidden border border-oro-inca/30">
          <button
            onClick={() => setScope('reported')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${scope === 'reported' ? 'bg-aji-rojo text-white' : 'bg-white dark:bg-noche-lima text-gray-600 dark:text-gray-300'}`}
          >
            {t('forum.reportedQueue')}
          </button>
          <button
            onClick={() => setScope('all')}
            className={`px-4 py-2 text-sm font-medium transition-colors ${scope === 'all' ? 'bg-aji-rojo text-white' : 'bg-white dark:bg-noche-lima text-gray-600 dark:text-gray-300'}`}
          >
            {t('forum.hiddenDeleted')}
          </button>
        </div>
      </div>

      {error && (
        <div className="text-center py-8">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={refresh} className="px-4 py-2 border border-oro-inca/40 rounded-lg">{t('forum.retry')}</button>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />)}
        </div>
      ) : queue && (queue.topics.length > 0 || queue.posts.length > 0) ? (
        <div className="space-y-8">
          {queue.topics.length > 0 && (
            <section>
              <h2 className="font-semibold text-lg text-noche-lima dark:text-white mb-3">📌 {t('forum.topics')}</h2>
              <div className="space-y-2">
                {queue.topics.map((topic) => (
                  <div key={topic.id} className="p-4 rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium text-noche-lima dark:text-white truncate">{topic.title}</p>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {t('forum.by')} {topic.author} · {topic.status}
                          {topic.reported && <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 text-xs font-semibold">⚠️ {t('forum.reported')}</span>}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <ActionButton
                          label={topic.status === 'visible' ? t('forum.hide') : t('forum.restore')}
                          loading={pendingAction === `topic:${topic.id}:${topic.status === 'visible' ? 'hide' : 'restore'}`}
                          onClick={() => moderate('topic', topic.id, topic.status === 'visible' ? 'hide' : 'restore')}
                        />
                        <ActionButton
                          label={t('forum.delete')}
                          danger
                          loading={pendingAction === `topic:${topic.id}:delete`}
                          onClick={() => {
                            if (confirm(t('forum.confirmDelete'))) moderate('topic', topic.id, 'delete');
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {queue.posts.length > 0 && (
            <section>
              <h2 className="font-semibold text-lg text-noche-lima dark:text-white mb-3">💬 {t('forum.posts')}</h2>
              <div className="space-y-2">
                {queue.posts.map((post) => (
                  <div key={post.id} className="p-4 rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-noche-lima dark:text-white truncate">{post.topicTitle}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 break-words">{post.body}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {t('forum.by')} {post.author} · {post.status}
                          {post.reported && <span className="ml-2 px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-semibold">⚠️ {t('forum.reported')}</span>}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <ActionButton
                          label={post.status === 'visible' ? t('forum.hide') : t('forum.restore')}
                          loading={pendingAction === `post:${post.id}:${post.status === 'visible' ? 'hide' : 'restore'}`}
                          onClick={() => moderate('post', post.id, post.status === 'visible' ? 'hide' : 'restore')}
                        />
                        <ActionButton
                          label={t('forum.delete')}
                          danger
                          loading={pendingAction === `post:${post.id}:delete`}
                          onClick={() => {
                            if (confirm(t('forum.confirmDelete'))) moderate('post', post.id, 'delete');
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <div className="text-center py-14">
          <p className="text-lg text-gray-500">✅ {t('forum.queueEmpty')}</p>
        </div>
      )}
    </div>
  );
};

function ActionButton({ label, onClick, danger, loading }: { label: string; onClick: () => void; danger?: boolean; loading?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
        danger
          ? 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60'
          : 'bg-oro-inca/15 text-oro-inca-dark hover:bg-oro-inca/30'
      }`}
    >
      {loading ? '⏳' : label}
    </button>
  );
}

export default AdminComunidade;
