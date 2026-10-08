// src/components/AdModerationQueue.tsx
// Super-admin moderation queue: approve or reject submitted ads.
//
// Only ads that are actually moderatable appear here. Rejection REQUIRES a
// reason — the advertiser cannot correct what they were never told, and an
// unexplained block reads as a system fault rather than a decision.
import { useState } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { adminModerateAd, type FinanceAdRow } from '../lib/api';
import { getAdStatusPresentation, AD_STATUS_TONE_CLASSES } from '../lib/adStatus';
import { showToast } from '../lib/toast';

/** States a super admin can still act on. */
const MODERATABLE = new Set(['pending_review', 'inactive_for_review', 'active']);

interface Props {
  ads: FinanceAdRow[];
  /** Reload the dashboard after a decision lands. */
  onModerated: () => void;
}

export function AdModerationQueue({ ads, onModerated }: Props) {
  const { getToken } = useAuth();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState('');

  const queue = ads.filter((ad) => MODERATABLE.has(ad.status));
  const awaitingReview = queue.filter((ad) => ad.status !== 'active');

  const act = async (adId: string, action: 'approve' | 'reject', why?: string) => {
    setBusyId(adId);
    try {
      const token = await getToken();
      if (!token) throw new Error('Sem sessão');
      const res = await adminModerateAd(token, adId, action, why);

      if (action === 'approve') {
        showToast('Anúncio aprovado e publicado.', 'success');
      } else if (res.terminal) {
        // Never imply a refund that did not go through.
        showToast(
          res.refunded
            ? 'Anúncio encerrado e valor devolvido ao anunciante.'
            : res.refundError
            ? `Anúncio encerrado, mas a devolução FALHOU: ${res.refundError}. Verifique no Stripe.`
            : 'Anúncio encerrado. Não havia pagamento a devolver.',
          res.refundError ? 'error' : 'success'
        );
      } else {
        showToast(
          `Anúncio reprovado. Restam ${res.attemptsRemaining} correções ao anunciante.`,
          'success'
        );
      }

      setRejectingId(null);
      setReason('');
      onModerated();
    } catch (err: any) {
      showToast(err?.message || 'Erro ao moderar o anúncio.', 'error');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white dark:bg-noche-lima rounded-2xl shadow-lg border border-oro-inca/20 overflow-hidden">
      <div className="px-4 py-3 border-b border-oro-inca/20 font-semibold text-noche-lima dark:text-white flex items-center justify-between">
        <span>⚖️ Moderação de anúncios</span>
        {awaitingReview.length > 0 && (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300">
            {awaitingReview.length} aguardando análise
          </span>
        )}
      </div>

      {queue.length === 0 ? (
        <p className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Nenhum anúncio aguardando moderação.
        </p>
      ) : (
        <ul className="divide-y divide-oro-inca/10">
          {queue.map((ad) => {
            const presentation = getAdStatusPresentation(ad.status);
            const tone = AD_STATUS_TONE_CLASSES[presentation.tone];
            const isPublished = ad.status === 'active';
            const attemptsLeft = Math.max(0, 3 - (ad.reviewAttempts ?? 0));
            const isBusy = busyId === ad.id;

            return (
              <li key={ad.id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-noche-lima dark:text-white truncate">{ad.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {ad.businessName}
                      {/* A community ad has no listing behind it, which changes
                          what the moderator is judging. */}
                      {!ad.businessId && ' · anúncio da comunidade'}
                    </p>
                    {ad.moderationReason && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        <strong>Última reprovação:</strong> {ad.moderationReason}
                      </p>
                    )}
                  </div>
                  <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset ${tone.badge}`}>
                    <span className={`h-1.5 w-1.5 rounded-full ${tone.dot}`} />
                    {presentation.label}
                  </span>
                </div>

                {/* State the consequence BEFORE the decision is taken. */}
                <p className="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                  {isPublished
                    ? 'Já publicado. Reprovar aqui desativa por infração, SEM devolução — o serviço de exibição foi prestado.'
                    : attemptsLeft <= 1
                    ? 'Esta é a última análise: reprovar encerra o anúncio e DEVOLVE o valor pago.'
                    : `Análises restantes ao anunciante: ${attemptsLeft}. A terceira reprovação encerra e devolve o valor.`}
                </p>

                {rejectingId === ad.id ? (
                  <div className="mt-3 space-y-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                      Motivo da reprovação (obrigatório, visível ao anunciante)
                    </label>
                    <textarea
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Ex: A imagem não corresponde ao serviço anunciado."
                      className="w-full p-2.5 text-sm rounded-lg border border-oro-inca/30 bg-white dark:bg-noche-lima text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-aji-rojo"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => act(ad.id, 'reject', reason.trim())}
                        disabled={isBusy || !reason.trim()}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isBusy ? 'Processando...' : 'Confirmar reprovação'}
                      </button>
                      <button
                        onClick={() => {
                          setRejectingId(null);
                          setReason('');
                        }}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-oro-inca/30 text-gray-600 dark:text-gray-400 hover:border-aji-rojo/40 transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    {!isPublished && (
                      <button
                        onClick={() => act(ad.id, 'approve')}
                        disabled={isBusy}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
                      >
                        {isBusy ? 'Processando...' : 'Aprovar e publicar'}
                      </button>
                    )}
                    <button
                      onClick={() => setRejectingId(ad.id)}
                      disabled={isBusy}
                      className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
                    >
                      {isPublished ? 'Desativar por infração' : 'Reprovar'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
