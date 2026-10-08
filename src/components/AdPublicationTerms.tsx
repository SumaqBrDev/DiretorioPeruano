// src/components/AdPublicationTerms.tsx
// The publication rules an advertiser must accept before submitting an ad.
//
// The text is fetched from GET /api/ad-terms rather than hardcoded here: the
// backend rejects a submission whose accepted version does not match the
// current one, and that promise only holds with a single source of truth.
// A hardcoded copy would silently drift and start rejecting every submission.
import { useEffect, useState } from 'react';
import { getAdTerms, type AdPublicationTerms as Terms } from '../lib/api';

interface Props {
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
  /** Reports the loaded version so the parent can submit it. */
  onVersionLoaded: (version: string | null) => void;
}

export function AdPublicationTerms({ accepted, onAcceptedChange, onVersionLoaded }: Props) {
  const [terms, setTerms] = useState<Terms | null>(null);
  const [error, setError] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getAdTerms()
      .then((data) => {
        if (cancelled) return;
        setTerms(data);
        onVersionLoaded(data.version);
      })
      .catch(() => {
        if (cancelled) return;
        setError(true);
        onVersionLoaded(null);
      });
    return () => {
      cancelled = true;
    };
    // Intentionally run once: the terms do not change within a form session.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Failing closed: without the rules on screen the advertiser cannot give
  // informed consent, so the checkbox is not offered at all.
  if (error) {
    return (
      <div className="rounded-lg border border-aji-rojo/40 bg-aji-rojo/5 p-4 text-sm text-aji-rojo">
        Não foi possível carregar as normas de publicação. Recarregue a página para continuar —
        o envio só é permitido com as normas à vista.
      </div>
    );
  }

  if (!terms) {
    return (
      <div className="rounded-lg border border-oro-inca/30 p-4 text-sm text-gray-500 dark:text-gray-400">
        Carregando as normas de publicação...
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-oro-inca/40 bg-white/60 dark:bg-noche-lima/40">
      <div className="p-4 border-b border-oro-inca/20">
        <h4 className="font-semibold text-sm text-noche-lima dark:text-white flex items-center gap-2">
          <span aria-hidden="true">⚖️</span> {terms.title}
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Versão {terms.version}</p>
      </div>

      <div
        className={`px-4 text-sm text-gray-700 dark:text-gray-300 overflow-y-auto transition-all ${
          expanded ? 'max-h-none py-4' : 'max-h-44 py-4'
        }`}
      >
        {terms.sections.map((section) => (
          <div key={section.title} className="mb-3 last:mb-0">
            <p className="font-semibold text-xs uppercase tracking-wide text-gray-600 dark:text-gray-400 mb-1">
              {section.title}
            </p>
            <p className="leading-relaxed whitespace-pre-line">{section.body}</p>
          </div>
        ))}
      </div>

      <div className="px-4 pb-2">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="text-xs font-semibold text-aji-rojo hover:underline"
        >
          {expanded ? 'Mostrar menos' : 'Ler todas as normas'}
        </button>
      </div>

      <label className="flex items-start gap-3 p-4 border-t border-oro-inca/20 cursor-pointer">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-aji-rojo"
        />
        <span className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
          {terms.acknowledgement}
        </span>
      </label>
    </div>
  );
}
