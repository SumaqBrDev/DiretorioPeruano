// src/lib/businessStatus.ts
//
// Single source of truth for "business status → visual tone". Extracted from
// MeuNegocio.tsx, where the same approved/pending/rejected/disabled ternary
// chain was duplicated for the big status badge and would have been
// duplicated again for the new collapsed business cards (DRY).

export type BusinessStatusTone = {
  /** Human label in pt-BR, matching the copy already shown in MeuNegocio.tsx. */
  label: string;
  /** Classes for a small colored dot (badge indicator, card avatar ring). */
  dotClass: string;
  /** Classes for a full pill badge (background + text + ring). */
  badgeClass: string;
};

const TONES: Record<string, BusinessStatusTone> = {
  approved: {
    label: 'Aprovado',
    dotClass: 'bg-emerald-500',
    badgeClass:
      'bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-900/40 dark:text-emerald-300 dark:ring-emerald-400/20',
  },
  pending: {
    label: 'Pendente de Aprovação',
    dotClass: 'bg-amber-500',
    badgeClass:
      'bg-amber-50 text-amber-700 ring-amber-600/20 dark:bg-amber-900/40 dark:text-amber-300 dark:ring-amber-400/20',
  },
  rejected: {
    label: 'Rejeitado',
    dotClass: 'bg-rose-500',
    badgeClass:
      'bg-rose-50 text-rose-700 ring-rose-600/20 dark:bg-rose-900/40 dark:text-rose-300 dark:ring-rose-400/20',
  },
  disabled: {
    label: 'Desabilitado',
    dotClass: 'bg-zinc-400',
    badgeClass:
      'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-400/20',
  },
};

const NEUTRAL_TONE: BusinessStatusTone = {
  label: '',
  dotClass: 'bg-zinc-400',
  badgeClass:
    'bg-zinc-100 text-zinc-600 ring-zinc-500/20 dark:bg-zinc-800 dark:text-zinc-400 dark:ring-zinc-400/20',
};

export function getBusinessStatusTone(status: string | null | undefined): BusinessStatusTone {
  // Empty/missing status reads as "pending" everywhere else in this codebase
  // (see MeuNegocio.tsx:512, businesses.ts default 'pending').
  if (!status) return TONES.pending;
  if (TONES[status]) return TONES[status];
  // Unknown status: neutral tone, but echo the raw value as the label instead
  // of silently showing nothing — an unrecognised status is a bug signal, not
  // something to hide from whoever is debugging it.
  return { ...NEUTRAL_TONE, label: status };
}
