// src/components/BusinessListCard.tsx
import { CaretDown } from '@phosphor-icons/react';
import { getBusinessStatusTone } from '../lib/businessStatus';
import type { ApiBusiness } from '../lib/api';

/**
 * One collapsed row in the "Meus Negócios" list — one business per row, never
 * a dropdown. Clicking anywhere on the row toggles the accordion detail that
 * the parent renders below it (see MeuNegocio.tsx).
 *
 * Shape follows the wireframe Jose attached (full pill, left avatar circle,
 * middle text bar, right affordance) adapted to this project's status-color
 * language instead of literal wireframe colors. The right-side affordance is
 * a rotating chevron, not a 6-dot icon: this card only expands/collapses, it
 * has no drag-to-reorder or hidden overflow menu, so a chevron is the
 * accurate (and accessible) signal — see the plan's "Traducción de la
 * referencia visual" note for the full rationale.
 */
export function BusinessListCard({
  business,
  isExpanded,
  onToggle,
}: {
  business: Pick<ApiBusiness, 'id' | 'name' | 'category' | 'status'>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const tone = getBusinessStatusTone(business.status);
  const initial = (business.name?.trim()?.[0] || '?').toUpperCase();

  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={isExpanded}
      aria-controls={`business-detail-${business.id}`}
      className={`w-full flex items-center gap-4 rounded-full border border-oro-inca/20 bg-white dark:bg-noche-lima px-5 py-4 text-left shadow-sm hover:border-aji-rojo/40 hover:shadow-md transition-all ${
        isExpanded ? 'rounded-b-2xl border-aji-rojo/40 ring-1 ring-aji-rojo/20' : ''
      }`}
    >
      <span
        className={`shrink-0 h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${tone.dotClass}`}
        aria-hidden="true"
      >
        {initial}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-noche-lima dark:text-white truncate">
          {business.name || 'Negócio sem nome'}
        </span>
        <span className="block text-xs text-gray-500 dark:text-gray-400 truncate">
          {tone.label}
        </span>
      </span>

      <CaretDown
        size={20}
        weight="bold"
        className={`shrink-0 text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180 text-aji-rojo' : ''}`}
        aria-hidden="true"
      />
    </button>
  );
}
