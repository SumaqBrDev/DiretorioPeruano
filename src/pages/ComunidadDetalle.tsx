// src/pages/ComunidadDetalle.tsx
// Detalle de un tema: hilo de comentarios estilo TikTok (un nivel de
// indentación; las respuestas muestran "@autor" como referencia) + votos
// like/dislike en tema y mensajes. Lectura pública; interactuar requiere sesión.
import { useCallback, useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '@clerk/clerk-react';
import { useTranslation } from 'react-i18next';
import { getCommunityTopic, createCommunityPost, toggleCommunityVote, reportCommunityContent } from '@/lib/api';
import type { CommunityTopicDetailResult } from '@/lib/api';
import { SEO } from '@/components/SEO';
import { CommunityAds } from '@/components/CommunityAds';

export const ComunidadDetalle = () => {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [data, setData] = useState<CommunityTopicDetailResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [replyText, setReplyText] = useState('');
  const [replyTo, setReplyTo] = useState<{ id: string; author: string } | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) return;
    const token = await getToken().catch(() => null);
    setLoading(true);
    setError(null);
    try {
      const result = await getCommunityTopic(token, id);
      setData(result);
    } catch (err: any) {
      setError(err?.message || 'Erro ao carregar o tema.');
    } finally {
      setLoading(false);
    }
  }, [getToken, id]);

  useEffect(() => {
    if (!isLoaded) return;
    refresh();
  }, [isLoaded, refresh]);

  const handleSubmit = async () => {
    if (!replyText.trim()) return;
    setSending(true);
    setSendError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      await createCommunityPost(token, {
        topicId: id!,
        body: replyText.trim(),
        parentId: replyTo?.id ?? null,
      });
      setReplyText('');
      setReplyTo(null);
      refresh();
    } catch (err: any) {
      setSendError(err?.message || 'Erro ao enviar o comentário.');
    } finally {
      setSending(false);
    }
  };

  const handleVote = async (targetType: 'topic' | 'post', targetId: string, value: 1 | -1) => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      if (!token) return;
      await toggleCommunityVote(token, { targetType, targetId, value });
      refresh();
    } catch {
      // silent — refresh keeps UI consistent
    }
  };

  const handleReport = async (targetType: 'topic' | 'post', targetId: string) => {
    if (!isSignedIn) return;
    try {
      const token = await getToken();
      if (!token) return;
      await reportCommunityContent(token, { targetType, targetId });
      alert(t('forum.reported'));
    } catch {
      // silent
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="h-10 w-2/3 rounded-lg bg-gray-200 dark:bg-zinc-800 animate-pulse mb-6" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-gray-200 dark:bg-zinc-800 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="container mx-auto px-4 py-16 text-center">
        <p className="text-red-600 dark:text-red-400 mb-4">{error || t('forum.notFound')}</p>
        <Link to="/comunidad" className="text-aji-rojo hover:underline">{t('forum.backToList')}</Link>
      </div>
    );
  }

  const { topic, posts } = data;
  // TikTok-style flattening: root posts + replies (single indent, @author ref)
  const roots = posts.filter((p) => !p.parentAuthor);
  const replies = posts.filter((p) => p.parentAuthor);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <SEO title={topic.title} description={topic.body.slice(0, 150)} />
      <div className="lg:grid lg:grid-cols-[1fr_300px] lg:gap-8">
        <div className="min-w-0 max-w-3xl">
          <Link to="/comunidad" className="text-sm text-aji-rojo hover:underline mb-4 inline-block">
            ← {t('forum.backToList')}
          </Link>

      {/* Topic */}
      <div className="p-6 rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima shadow-sm mb-8">
        <h1 className="font-playfair text-2xl font-bold text-noche-lima dark:text-white">{topic.title}</h1>
        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
          <span>{t('forum.by')} {topic.author}</span>
          <span>{new Date(topic.createdAt).toLocaleDateString()}</span>
          <span>👁 {topic.viewCount}</span>
        </div>
        <p className="mt-4 text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{topic.body}</p>
        <div className="flex items-center gap-3 mt-5 pt-4 border-t border-oro-inca/10">
          <VoteButtons
            signedIn={!!isSignedIn}
            score={topic.score}
            onVote={(v) => handleVote('topic', topic.id, v)}
          />
          {isSignedIn && (
            <button
              onClick={() => handleReport('topic', topic.id)}
              className="text-xs text-gray-400 hover:text-aji-rojo transition-colors"
            >
              ⚑ {t('forum.report')}
            </button>
          )}
        </div>
      </div>

      {/* Comment box */}
      {isSignedIn ? (
        <div className="p-5 rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima mb-8">
          {replyTo && (
            <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
              <span>{t('forum.replyingTo')} <strong>@{replyTo.author}</strong></span>
              <button onClick={() => setReplyTo(null)} className="text-aji-rojo hover:underline">
                {t('forum.cancel')}
              </button>
            </div>
          )}
          <textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder={t('forum.commentPlaceholder')}
            maxLength={2000}
            rows={3}
            className="w-full p-3 rounded-lg border border-oro-inca/30 bg-creme-andino dark:bg-zinc-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo resize-y"
          />
          {sendError && <p className="text-red-600 dark:text-red-400 text-sm mt-2">{sendError}</p>}
          <div className="flex items-center justify-between mt-3">
            <span className="text-xs text-gray-500">{replyText.length}/2000</span>
            <button
              onClick={handleSubmit}
              disabled={sending || !replyText.trim()}
              className="px-5 py-2 bg-aji-rojo hover:bg-aji-rojo/90 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? t('forum.saving') : t('forum.respond')}
            </button>
          </div>
        </div>
      ) : (
        <div className="p-5 rounded-xl border border-oro-inca/20 bg-creme-andino dark:bg-zinc-900 text-center mb-8">
          <p className="text-gray-600 dark:text-gray-300">{t('forum.loginToParticipate')}</p>
        </div>
      )}

      {/* Posts */}
      {posts.length === 0 ? (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">{t('forum.noComments')}</p>
      ) : (
        <div className="space-y-4">
          {roots.map((post) => (
            <div key={post.id} className="p-4 rounded-xl border border-oro-inca/20 bg-white dark:bg-noche-lima">
              <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-1">
                <span className="font-medium text-noche-lima dark:text-white">{post.author}</span>
                <span>{new Date(post.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.body}</p>
              <div className="flex items-center gap-3 mt-3">
                <VoteButtons
                  signedIn={!!isSignedIn}
                  score={post.score}
                  onVote={(v) => handleVote('post', post.id, v)}
                />
                {isSignedIn && (
                  <>
                    <button
                      onClick={() => setReplyTo({ id: post.id, author: post.author })}
                      className="text-xs text-gray-500 hover:text-aji-rojo transition-colors"
                    >
                      ↩ {t('forum.respond')}
                    </button>
                    <button
                      onClick={() => handleReport('post', post.id)}
                      className="text-xs text-gray-400 hover:text-aji-rojo transition-colors"
                    >
                      ⚑ {t('forum.report')}
                    </button>
                  </>
                )}
              </div>

              {/* Replies — single indent, @author reference (TikTok style) */}
              {replies.filter((r) => r.parentAuthor === post.author).length > 0 && (
                <div className="mt-3 pl-4 border-l-2 border-oro-inca/30 space-y-3">
                  {replies.filter((r) => r.parentAuthor === post.author).map((reply) => (
                    <div key={reply.id} className="p-3 rounded-lg bg-creme-andino dark:bg-zinc-900">
                      <div className="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400 mb-1">
                        <span className="font-medium text-noche-lima dark:text-white">{reply.author}</span>
                        <span className="text-xs text-aji-rojo">@{reply.parentAuthor}</span>
                        <span>{new Date(reply.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap text-sm">{reply.body}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <VoteButtons
                          signedIn={!!isSignedIn}
                          score={reply.score}
                          onVote={(v) => handleVote('post', reply.id, v)}
                        />
                        {isSignedIn && (
                          <button
                            onClick={() => setReplyTo({ id: reply.id, author: reply.author })}
                            className="text-xs text-gray-500 hover:text-aji-rojo transition-colors"
                          >
                            ↩ {t('forum.respond')}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
        </div>

        {/* Sidebar ads (Opción A) — desktop only */}
        <CommunityAds variant="sidebar" limit={4} />
      </div>
    </div>
  );
};

function VoteButtons({ signedIn, score, onVote }: { signedIn: boolean; score: number; onVote: (v: 1 | -1) => void }) {
  const { t } = useTranslation();
  if (!signedIn) {
    return (
      <span className="flex items-center gap-2 text-sm text-gray-500">
        <span aria-hidden>👍</span>
        <span className="font-medium">{score}</span>
        <span aria-hidden>👎</span>
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1 text-sm">
      <button
        onClick={() => onVote(1)}
        aria-label={t('forum.like')}
        title={t('forum.like')}
        className="px-2 py-1 rounded hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors"
      >
        👍
      </button>
      <span className="font-medium text-gray-700 dark:text-gray-300 min-w-[1.5rem] text-center">{score}</span>
      <button
        onClick={() => onVote(-1)}
        aria-label={t('forum.dislike')}
        title={t('forum.dislike')}
        className="px-2 py-1 rounded hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
      >
        👎
      </button>
    </span>
  );
}

export default ComunidadDetalle;
