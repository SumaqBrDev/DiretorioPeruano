// src/pages/Preferencias.tsx
// /preferencias — LGPD rights/preferences hub (WU5 task 5.1, design D7/D9).
//
// Shows the user's CURRENT consent state per document/purpose (own rows only,
// resolved client-side by src/lib/consentHistory — mirrors the server's
// resolveCurrentConsents), lets them change optional (cookie) preferences
// (grant/revoke evidence via /api/consent + preference upsert per D7) and
// exports their own personal data + consent history as a JSON download
// (LGPD access/portability channel, GET /api/consent/export).
//
// Mandatory service-contract consents are displayed as NON-REVOCABLE while
// the account is active — the UI offers no revoke control for them and the
// server independently rejects any attempt (409 MANDATORY_NOT_REVOCABLE).
// localStorage/sessionStorage is never evidence (D1); evidence is the
// append-only ConsentRecord rows written by the API.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth, useUser } from '@clerk/clerk-react';
import { motion } from 'motion/react';
import {
  UserGear,
  Check,
  X,
  DownloadSimple,
  WarningCircle,
  Lock,
} from '@phosphor-icons/react';

import { Breadcrumb } from '../components/Breadcrumb';
import { useConsentStore } from '../stores/useConsentStore';
import { COOKIE_CATEGORIES, getLegalDoc } from '../config/legal';
import { normalizeConsentLocale } from '../lib/signupIntent';
import {
  resolveCurrentFromRecords,
  isMandatoryPurpose,
  isOptionalPurpose,
} from '../lib/consentHistory';
import {
  getConsentHistory,
  getConsentStatus,
  recordConsent,
  revokeConsent,
  exportConsentData,
  type ConsentRecord,
} from '../lib/api';

const COOKIE_DOC_ID = 'cookie_policy';

/** Fresh idempotency key per user action (settings source; D2). */
function newIdempotencyKey(prefix: string, purpose: string): string {
  return `settings-${prefix}-${purpose}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatDate(iso: string | undefined, language: string): string {
  if (!iso) return '—';
  const locale = language.toLowerCase().startsWith('es') ? 'es-PE' : 'pt-BR';
  return new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export const Preferencias = () => {
  const { t, i18n } = useTranslation();
  const { user, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { preferences, hydrated, loadPreferences, savePreferences } = useConsentStore();

  const [records, setRecords] = useState<ConsentRecord[]>([]);
  const [mandatoryCurrent, setMandatoryCurrent] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [cookieSaving, setCookieSaving] = useState(false);
  const [cookieSaved, setCookieSaved] = useState(false);
  const [cookieError, setCookieError] = useState<string | null>(null);

  const [revoking, setRevoking] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  const [exporting, setExporting] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const refresh = async (token: string) => {
    const [history, status] = await Promise.all([getConsentHistory(token), getConsentStatus(token)]);
    setRecords(history.records);
    setMandatoryCurrent(status.mandatoryCurrent);
  };

  useEffect(() => {
    if (!isLoaded || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        if (!token) {
          if (!cancelled) setLoadError(t('preferencias.page.loading'));
          return;
        }
        await refresh(token);
        await loadPreferences(token);
        if (!cancelled) setLoading(false);
      } catch {
        if (!cancelled) {
          setLoadError(t('preferencias.page.loading'));
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, user, getToken]);

  // Initialize the cookie toggles from the current saved preferences once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    const initial: Record<string, boolean> = {};
    for (const cat of COOKIE_CATEGORIES) {
      if (cat.essential) continue;
      initial[cat.id] = preferences?.categories[cat.id] === true;
    }
    setToggles(initial);
  }, [hydrated, preferences]);

  const currentRows = resolveCurrentFromRecords(records);
  const mandatoryRows = currentRows.filter((r) => isMandatoryPurpose(r.purpose));
  const optionalRows = currentRows.filter((r) => isOptionalPurpose(r.purpose));

  const handleSaveCookies = async () => {
    if (cookieSaving) return;
    setCookieSaving(true);
    setCookieSaved(false);
    setCookieError(null);
    setRevokeError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('missing token');
      const before = preferences?.categories ?? {};
      const cookieDoc = getLegalDoc(COOKIE_DOC_ID);
      const changes: Array<{ type: 'grant' | 'revoke'; purpose: string }> = [];
      for (const cat of COOKIE_CATEGORIES) {
        if (cat.essential) continue;
        const was = before[cat.id] === true;
        const now = toggles[cat.id] === true;
        if (now && !was) changes.push({ type: 'grant', purpose: cat.id });
        if (!now && was) changes.push({ type: 'revoke', purpose: cat.id });
      }
      for (const ch of changes) {
        if (ch.type === 'grant') {
          await recordConsent(token, {
            documentType: COOKIE_DOC_ID,
            documentVersion: cookieDoc?.version ?? '1',
            purpose: ch.purpose,
            legalBasis: 'consent',
            source: 'settings',
            locale: normalizeConsentLocale(i18n.language),
            granted: true,
            idempotencyKey: newIdempotencyKey('grant', ch.purpose),
          });
        } else {
          await revokeConsent(token, {
            documentType: COOKIE_DOC_ID,
            purpose: ch.purpose,
            idempotencyKey: newIdempotencyKey('revoke', ch.purpose),
            source: 'settings',
            locale: normalizeConsentLocale(i18n.language),
          });
        }
      }
      await savePreferences({ ...toggles, essential: true }, { token, locale: i18n.language });
      setCookieSaved(true);
      await refresh(token);
    } catch {
      setCookieError(t('preferencias.revoke.error'));
    } finally {
      setCookieSaving(false);
    }
  };

  const handleRevoke = async (purpose: string) => {
    if (revoking) return;
    setRevoking(purpose);
    setRevokeError(null);
    setCookieError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('missing token');
      await revokeConsent(token, {
        documentType: COOKIE_DOC_ID,
        purpose,
        idempotencyKey: newIdempotencyKey('revoke', purpose),
        source: 'settings',
        locale: normalizeConsentLocale(i18n.language),
      });
      // Keep the operational preference consistent with the appended revocation
      // (banner/script gate reflect the new choice).
      await savePreferences(
        { ...(preferences?.categories ?? {}), [purpose]: false, essential: true },
        { token, locale: i18n.language }
      );
      await refresh(token);
    } catch {
      setRevokeError(t('preferencias.revoke.error'));
    } finally {
      setRevoking(null);
    }
  };

  const handleExport = async () => {
    if (exporting) return;
    setExporting(true);
    setExportDone(false);
    setExportError(null);
    try {
      const token = await getToken();
      if (!token) throw new Error('missing token');
      const data = await exportConsentData(token);
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `conectaperu-meus-dados-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(anchor);
      anchor.click();
      document.body.removeChild(anchor);
      URL.revokeObjectURL(url);
      setExportDone(true);
    } catch {
      setExportError(t('preferencias.export.error'));
    } finally {
      setExporting(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-aji-rojo border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-creme-andino dark:bg-zinc-950">
        <p className="text-gray-600 dark:text-gray-400">Acesso negado</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-creme-andino dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('preferencias.page.title') },
          ]}
        />

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-10 mt-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex-shrink-0 w-11 h-11 bg-aji-rojo/10 dark:bg-aji-rojo/20 rounded-xl flex items-center justify-center">
                <UserGear className="w-6 h-6 text-aji-rojo" weight="duotone" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tighter leading-none">
                {t('preferencias.page.title')}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              {t('preferencias.page.subtitle')}
            </p>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-4 border-aji-rojo border-t-transparent" />
              <p className="text-gray-500 dark:text-gray-400 text-sm">{t('preferencias.page.loading')}</p>
            </div>
          ) : loadError ? (
            <div className="p-5 bg-aji-rojo/10 border border-aji-rojo/30 rounded-xl text-sm text-aji-rojo">
              {loadError}
            </div>
          ) : (
            <>
              {!mandatoryCurrent && (
                <div className="mb-8 p-5 bg-oro-inca/10 border border-oro-inca/30 rounded-xl">
                  <div className="flex items-start gap-3">
                    <WarningCircle className="w-5 h-5 text-oro-inca mt-0.5 shrink-0" weight="duotone" />
                    <div>
                      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                        {t('preferencias.reconsent.title')}
                      </h2>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                        {t('preferencias.reconsent.body')}
                      </p>
                      <Link
                        to="/reconsent"
                        className="inline-block mt-3 text-sm text-aji-rojo hover:underline font-medium"
                      >
                        {t('preferencias.reconsent.link')}
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {/* Current consents (LGPD) */}
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {t('preferencias.consents.title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                  {t('preferencias.consents.subtitle')}
                </p>

                {currentRows.length === 0 && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 p-5 bg-white dark:bg-zinc-800/60 rounded-xl border border-oro-inca/10">
                    {t('preferencias.consents.empty')}
                  </p>
                )}

                <div className="grid gap-4">
                  {currentRows.map((row, index) => {
                    const mandatory = isMandatoryPurpose(row.purpose);
                    const optional = isOptionalPurpose(row.purpose);
                    return (
                      <motion.div
                        key={`${row.documentType}-${row.purpose}`}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.05 }}
                        className="bg-white dark:bg-zinc-800/80 rounded-xl p-5 border border-oro-inca/10 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4 flex-wrap">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                                {t(`preferencias.consents.doc.${row.documentType}`)}
                              </h3>
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-gray-600 dark:text-gray-300">
                                {t(`preferencias.consents.purpose.${row.purpose}`)}
                              </span>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                              {t('preferencias.consents.version')} {row.version} ·{' '}
                              {t('preferencias.consents.date')} {formatDate(row.consentedAt, i18n.language)}
                            </p>
                            {mandatory && (
                              <p className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400 mt-2">
                                <Lock className="w-3.5 h-3.5" weight="bold" />
                                {t('preferencias.consents.mandatoryNote')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            {row.granted ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                <Check className="w-3.5 h-3.5" weight="bold" />
                                {t('preferencias.consents.granted')}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                                <X className="w-3.5 h-3.5" weight="bold" />
                                {t('preferencias.consents.revoked')}
                              </span>
                            )}
                            {optional && row.granted && (
                              <button
                                onClick={() => handleRevoke(row.purpose)}
                                disabled={revoking !== null}
                                className="text-xs font-medium px-3 py-2 rounded-lg border border-aji-rojo/30 text-aji-rojo hover:bg-aji-rojo/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {revoking === row.purpose
                                  ? t('preferencias.revoke.revoking')
                                  : t('preferencias.revoke.button')}
                              </button>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {revokeError && (
                  <p className="mt-3 text-sm text-aji-rojo">{revokeError}</p>
                )}
              </section>

              {/* Cookie preferences */}
              <section className="mb-10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {t('preferencias.cookies.title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                  {t('preferencias.cookies.subtitle')}
                </p>

                <div className="grid gap-4 mb-5">
                  {COOKIE_CATEGORIES.map((cat, index) => {
                    const checked = cat.essential ? true : toggles[cat.id] === true;
                    return (
                      <motion.div
                        key={cat.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: index * 0.06 }}
                        className="bg-white dark:bg-zinc-800/80 rounded-xl p-5 border border-oro-inca/10 shadow-sm flex items-start justify-between gap-4"
                      >
                        <div>
                          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                            {t(cat.labelKey)}
                          </h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 leading-relaxed">
                            {t(`cookies.category.${cat.id}Description`)}
                          </p>
                        </div>
                        <label className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 shrink-0 cursor-pointer">
                          {cat.essential && (
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              <Check className="w-3.5 h-3.5" weight="bold" />
                              {t('cookies.page.alwaysActive')}
                            </span>
                          )}
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={cat.essential}
                            onChange={(e) =>
                              setToggles((s) => ({ ...s, [cat.id]: e.target.checked }))
                            }
                            className="h-4 w-4 accent-aji-rojo"
                          />
                        </label>
                      </motion.div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button
                    onClick={handleSaveCookies}
                    disabled={cookieSaving}
                    className="bg-aji-rojo hover:bg-aji-rojo/90 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {cookieSaving ? t('preferencias.cookies.saving') : t('preferencias.cookies.save')}
                  </button>
                  {cookieSaved && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      {t('preferencias.cookies.saved')}
                    </span>
                  )}
                </div>
                {cookieError && <p className="mt-3 text-sm text-aji-rojo">{cookieError}</p>}
              </section>

              {/* Export (LGPD access/portability) */}
              <section className="mb-10 p-6 bg-white dark:bg-zinc-800/60 rounded-xl border border-oro-inca/10">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {t('preferencias.export.title')}
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-5 leading-relaxed">
                  {t('preferencias.export.subtitle')}
                </p>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                  <button
                    onClick={handleExport}
                    disabled={exporting}
                    className="inline-flex items-center gap-2 bg-zinc-900 dark:bg-zinc-100 hover:bg-zinc-700 dark:hover:bg-zinc-300 text-white dark:text-zinc-900 text-sm font-medium px-6 py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <DownloadSimple className="w-4 h-4" weight="bold" />
                    {exporting ? t('preferencias.export.exporting') : t('preferencias.export.button')}
                  </button>
                  {exportDone && (
                    <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                      {t('preferencias.export.done')}
                    </span>
                  )}
                </div>
                {exportError && <p className="mt-3 text-sm text-aji-rojo">{exportError}</p>}
              </section>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};
