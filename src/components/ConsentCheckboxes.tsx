// src/components/ConsentCheckboxes.tsx
// LGPD consent checkbox group (WU3, design D1; LGPD skill checklist).
// - ONE mandatory checkbox, unchecked by default; submit must be blocked until
//   checked (the parent enforces it — Login, Onboarding, Reconsent).
// - Optional consents are SEPARATE checkboxes, never grouped with the
//   mandatory one (PER-18: never mix contractual acceptance with marketing).
// - Legal links open in a new tab (target=_blank rel=noopener noreferrer) so
//   the user does not lose entered form data while reading the documents.
// Controlled component: the parent owns all checked state.

import { useTranslation } from 'react-i18next';

export interface OptionalConsentOption {
  id: string;
  /** i18n key for the option label. */
  labelKey: string;
}

interface ConsentCheckboxesProps {
  mandatoryChecked: boolean;
  onMandatoryChange: (checked: boolean) => void;
  /** Optional consents rendered as separate checkboxes (default: none). */
  optionalOptions?: OptionalConsentOption[];
  optionalChecked?: Record<string, boolean>;
  onOptionalChange?: (id: string, checked: boolean) => void;
  /** Error message; the mandatory input gets aria-invalid + aria-describedby. */
  error?: string | null;
}

export const ConsentCheckboxes = ({
  mandatoryChecked,
  onMandatoryChange,
  optionalOptions = [],
  optionalChecked = {},
  onOptionalChange,
  error = null,
}: ConsentCheckboxesProps) => {
  const { t } = useTranslation();
  const errorId = 'consent-mandatory-error';

  return (
    <div className="space-y-3 text-left">
      {/* Mandatory — single unchecked-by-default checkbox with legal links */}
      <label className="flex items-start gap-3 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={mandatoryChecked}
          onChange={(e) => onMandatoryChange(e.target.checked)}
          aria-invalid={!!error}
          aria-describedby={error ? errorId : undefined}
          className="mt-0.5 h-4 w-4 rounded border-oro-inca/40 text-aji-rojo focus:ring-aji-rojo accent-aji-rojo"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {t('consent.mandatory.prefix')}{' '}
          <a
            href="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="text-aji-rojo font-medium hover:underline underline-offset-2"
          >
            {t('footer.terms')}
          </a>{' '}
          {t('consent.mandatory.and')}{' '}
          <a
            href="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="text-aji-rojo font-medium hover:underline underline-offset-2"
          >
            {t('footer.privacy')}
          </a>
        </span>
      </label>

      {error && (
        <p id={errorId} role="alert" className="text-red-500 text-xs flex items-center gap-1">
          <span aria-hidden="true">⚠</span> {error}
        </p>
      )}

      {/* Optional consents — always separate checkboxes */}
      {optionalOptions.map((opt) => {
        const checked = optionalChecked[opt.id] ?? false;
        return (
          <label key={opt.id} className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onOptionalChange?.(opt.id, e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-oro-inca/40 text-aji-rojo focus:ring-aji-rojo accent-aji-rojo"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
              {t(opt.labelKey)}
            </span>
          </label>
        );
      })}
    </div>
  );
};
