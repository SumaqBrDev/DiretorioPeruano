// src/lib/adStatus.ts
// Single source of truth for how an ad status is presented to a human.
//
// Statuses are raw backend strings ('pending_review', 'inactive_for_review'…).
// Rendering them bare leaks internals and reads as a bug, so every surface
// goes through here instead of keeping its own ternary chain.

export type AdStatusTone = 'success' | 'warning' | 'danger' | 'neutral';

export interface AdStatusPresentation {
  label: string;
  tone: AdStatusTone;
  /** Short explanation of what the state means for the advertiser. */
  hint?: string;
}

const PRESENTATION: Record<string, AdStatusPresentation> = {
  draft: {
    label: 'Rascunho',
    tone: 'neutral',
    hint: 'Ainda não enviado para análise. Nada foi cobrado.',
  },
  pending_payment: {
    label: 'Aguardando pagamento',
    tone: 'warning',
    hint: 'O anúncio será enviado para análise assim que o pagamento for confirmado.',
  },
  pending_review: {
    label: 'Em análise',
    tone: 'warning',
    hint: 'Nossa equipe está revisando o anúncio. Os 30 dias começam na aprovação.',
  },
  inactive_for_review: {
    label: 'Inativo para revisão',
    tone: 'danger',
    hint: 'O anúncio não foi aprovado. Corrija os pontos indicados e envie novamente.',
  },
  active: {
    label: 'Ativo',
    tone: 'success',
    hint: 'Publicado e visível na Comunidade.',
  },
  rejected_final: {
    label: 'Reprovado em definitivo',
    tone: 'danger',
    hint: 'Limite de análises atingido. O valor pago foi devolvido.',
  },
  disabled_breach: {
    label: 'Desativado por infração',
    tone: 'danger',
    hint: 'O anúncio foi publicado e descumpriu as normas. Sem devolução, conforme as normas aceitas.',
  },
  expired: {
    label: 'Expirado',
    tone: 'neutral',
    hint: 'O período de 30 dias terminou.',
  },
  cancelled: {
    label: 'Cancelado',
    tone: 'neutral',
  },
};

/**
 * Presentation for an ad status.
 *
 * An unknown status falls back to the raw value with a neutral tone rather
 * than throwing or rendering nothing: a new backend status must degrade to
 * something visible, not to a blank cell.
 */
export function getAdStatusPresentation(status: string): AdStatusPresentation {
  return PRESENTATION[status] ?? { label: status, tone: 'neutral' };
}

/** Tailwind classes per tone, shared by every table that shows ad statuses. */
export const AD_STATUS_TONE_CLASSES: Record<AdStatusTone, { badge: string; dot: string }> = {
  success: {
    badge:
      'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/30 dark:text-emerald-300 dark:ring-emerald-400/20',
    dot: 'bg-emerald-500',
  },
  warning: {
    badge:
      'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/30 dark:text-amber-300 dark:ring-amber-400/20',
    dot: 'bg-amber-500',
  },
  danger: {
    badge:
      'bg-red-50 text-red-700 ring-red-600/20 dark:bg-red-900/30 dark:text-red-300 dark:ring-red-400/20',
    dot: 'bg-red-500',
  },
  neutral: {
    badge:
      'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-400/20',
    dot: 'bg-zinc-400',
  },
};
