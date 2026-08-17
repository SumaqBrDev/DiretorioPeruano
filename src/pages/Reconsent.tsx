// src/pages/Reconsent.tsx
// Dedicated re-consent screen (WU3 task 3.4, design D3/D9). Existing users who
// hit the CONSENT_REQUIRED gate (e.g. POST /api/businesses 409) land here to
// accept the CURRENT mandatory document versions.
//
// Dismissal contract: the Cancel button writes NOTHING — no server call, no
// storage write. The user remains GATED (next gated action still 409
// CONSENT_REQUIRED → this screen again). Dismissal is never consent.

import { useReducer, useEffect, useState } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConsentCheckboxes } from '../components/ConsentCheckboxes';
import { getConsentStatus, recordConsent } from '../lib/api';
import { activeLegalDocs } from '../config/legal';
import {
  INITIAL_SIGNUP_STATE,
  signupConsentReducer,
} from '../lib/signupConsentMachine';
import {
  buildSignupIntent,
  buildConsentRequests,
  normalizeConsentLocale,
} from '../lib/signupIntent';

const REQUIRED_DOC_LABELS: Record<string, string> = {
  terms_of_service: 'pages.termos',
  privacy_policy: 'pages.privacidade',
  cookie_policy: 'footer.cookies',
};

export const Reconsent = () => {
  const { t, i18n } = useTranslation();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from || '/';

  // Start GATED: RECONSENT_ACCEPT → reconsent → EVIDENCE_RECORDED (after the
  // POST succeeds) → proceed; DISMISS always lands back on gate_hit.
  const [, dispatch] = useReducer(signupConsentReducer, {
    ...INITIAL_SIGNUP_STATE,
    phase: 'gate_hit',
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mandatoryChecked, setMandatoryChecked] = useState(false);
  const [requiredDocs, setRequiredDocs] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setError(t('consent.reconsent.error'));
          return;
        }
        const status = await getConsentStatus(token);
        if (cancelled) return;
        if (status.mandatoryCurrent) {
          // Nothing to re-consent — go back to where the user came from.
          navigate(from, { replace: true });
          return;
        }
        setRequiredDocs(status.requiredDocs);
      } catch {
        if (!cancelled) setError(t('consent.reconsent.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, user, getToken, from, navigate, t]);

  const handleAccept = async () => {
    setError(null);
    if (!mandatoryChecked) {
      setError(t('consent.errors.mandatory_required'));
      return;
    }
    dispatch({ type: 'RECONSENT_ACCEPT' });
    setBusy(true);
    try {
      const token = await getToken();
      if (!token) {
        setBusy(false);
        setError(t('consent.reconsent.error'));
        return;
      }
      const active = activeLegalDocs();
      const serviceIds = active.filter((d) => d.purposes.includes('service')).map((d) => d.id);
      const intent = buildSignupIntent(serviceIds, []);
      const requests = buildConsentRequests(intent, active, {
        source: 'reconsent',
        locale: normalizeConsentLocale(i18n.language),
      });
      for (const req of requests) {
        await recordConsent(token, req);
      }
      dispatch({ type: 'EVIDENCE_RECORDED' });
      navigate(from, { replace: true });
    } catch (err) {
      console.error('Erro ao registrar consentimento:', err);
      setBusy(false);
      setError(t('consent.reconsent.error'));
    }
  };

  const handleDismiss = () => {
    // DISMISS → gate_hit: no server write, no storage write — still gated.
    dispatch({ type: 'DISMISS' });
    navigate(from, { replace: true });
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino">
        <p className="text-gray-600 dark:text-gray-400">Acesso negado</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-creme-andino dark:bg-zinc-950 gap-4">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-aji-rojo border-t-transparent" />
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('consent.onboarding.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950 py-16 px-4">
      <div className="bg-white dark:bg-zinc-800 p-8 rounded-2xl shadow-xl w-full max-w-md border border-oro-inca/20">
        <h1 className="text-2xl font-bold text-center mb-4 text-aji-rojo tracking-tighter">
          {t('consent.reconsent.title')}
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6 leading-relaxed">
          {t('consent.reconsent.subtitle')}
        </p>

        {requiredDocs.length > 0 && (
          <ul className="text-xs text-gray-500 dark:text-gray-400 mb-4 list-disc list-inside space-y-1">
            {requiredDocs.map((docId) => (
              <li key={docId}>{t(REQUIRED_DOC_LABELS[docId] ?? docId)}</li>
            ))}
          </ul>
        )}

        <ConsentCheckboxes
          mandatoryChecked={mandatoryChecked}
          onMandatoryChange={(checked) => {
            setMandatoryChecked(checked);
            if (checked) setError(null);
          }}
          error={error}
        />

        <div className="flex flex-col gap-3 mt-6">
          <button
            onClick={handleAccept}
            disabled={busy}
            className="w-full bg-aji-rojo text-white py-3 rounded-xl font-semibold hover:bg-aji-rojo/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {busy ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                {t('consent.reconsent.saving')}
              </>
            ) : (
              t('consent.reconsent.accept')
            )}
          </button>
          <button
            onClick={handleDismiss}
            disabled={busy}
            className="w-full border border-oro-inca/30 text-gray-700 dark:text-gray-300 py-3 rounded-xl font-medium hover:bg-oro-inca/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('consent.reconsent.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
};
