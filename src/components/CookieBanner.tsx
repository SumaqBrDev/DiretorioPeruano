// src/components/CookieBanner.tsx
// Versioned, category-based cookie banner (WU4 task 4.3, design D7/D9).
//
// Behavior contract (spec: cookie-consent-manager / Cookies page and banner):
// - The banner reflects saved preferences: once a decision exists it does NOT
//   re-ask — it renders nothing until the user changes preferences elsewhere
//   (e.g. the /cookies page).
// - No decision yet → the banner asks with per-category toggles. Essentials
//   are locked on; optional categories default to off.
// - "Aceitar todos" / "Aceitar selecionados" / "Rejeitar opcionais" persist
//   a versioned preference record (localStorage UI cache + server sync when
//   authenticated) and apply it to the script gate immediately.
// - Dismissing (X) writes NOTHING — dismissal is never consent; the banner
//   simply hides for this visit.

import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { Cookie, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

import { useConsentStore } from '../stores/useConsentStore';
import { COOKIE_CATEGORIES } from '../config/legal';

export const CookieBanner = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const { preferences, hydrated, loadPreferences, savePreferences } = useConsentStore();

  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [saving, setSaving] = useState(false);

  // Optional-category toggles (essentials are always on).
  const optionalCategories = useMemo(() => COOKIE_CATEGORIES.filter((c) => !c.essential), []);
  const [toggles, setToggles] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(optionalCategories.map((c) => [c.id, false]))
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = await getToken();
      if (cancelled) return;
      await loadPreferences(token);
    })();
    return () => {
      cancelled = true;
    };
  }, [getToken, loadPreferences]);

  // Show the banner only for users who have never decided. Saved preferences
  // hide it (reflects saved choice); dismissal hides it for this visit only.
  useEffect(() => {
    if (!hydrated) return;
    if (preferences || dismissed) {
      setVisible(false);
      return;
    }
    // Small delay so it doesn't appear during page transition.
    const timer = setTimeout(() => setVisible(true), 500);
    return () => clearTimeout(timer);
  }, [hydrated, preferences, dismissed]);

  const persist = async (categories: Record<string, boolean>) => {
    if (saving) return;
    setSaving(true);
    try {
      const token = await getToken();
      await savePreferences(categories, { token, locale: i18n.language });
      setVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const handleAcceptAll = () => {
    const all = Object.fromEntries(COOKIE_CATEGORIES.map((c) => [c.id, true]));
    void persist(all);
  };

  const handleAcceptSelected = () => {
    void persist({ ...toggles, essential: true });
  };

  const handleRejectOptional = () => {
    const essentialOnly = Object.fromEntries(COOKIE_CATEGORIES.map((c) => [c.id, c.essential]));
    void persist(essentialOnly);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setVisible(false);
    // No storage write — dismissal is never consent.
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 24 }}
          className="fixed bottom-0 left-0 right-0 z-50 p-4"
        >
          <div className="max-w-6xl mx-auto">
            <div className="bg-white dark:bg-zinc-800 border border-oro-inca/20 rounded-2xl shadow-2xl p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <div className="flex items-start gap-3 flex-1">
                <div className="flex-shrink-0 w-10 h-10 bg-aji-rojo/10 dark:bg-aji-rojo/20 rounded-lg flex items-center justify-center">
                  <Cookie className="w-5 h-5 text-aji-rojo" weight="duotone" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {t('cookies.banner.title')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-prose">
                    {t('cookies.banner.description')}
                  </p>
                  <div className="mt-3 space-y-1.5">
                    {COOKIE_CATEGORIES.map((cat) => {
                      const checked = cat.essential ? true : toggles[cat.id] === true;
                      return (
                        <label
                          key={cat.id}
                          className="flex items-start gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={cat.essential}
                            onChange={(e) =>
                              setToggles((s) => ({ ...s, [cat.id]: e.target.checked }))
                            }
                            className="mt-0.5 h-3.5 w-3.5 accent-aji-rojo"
                          />
                          <span>
                            <span className="font-medium">{t(cat.labelKey)}</span>
                            <span className="text-gray-500 dark:text-gray-400">
                              {' '}
                              — {t(`cookies.category.${cat.id}Description`)}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <button
                  onClick={handleAcceptAll}
                  disabled={saving}
                  className="bg-aji-rojo hover:bg-aji-rojo/90 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('cookies.banner.acceptAll')}
                </button>
                <button
                  onClick={handleAcceptSelected}
                  disabled={saving}
                  className="border border-oro-inca/40 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-oro-inca/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('cookies.banner.acceptSelected')}
                </button>
                <button
                  onClick={handleRejectOptional}
                  disabled={saving}
                  className="border border-oro-inca/40 text-gray-700 dark:text-gray-300 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-oro-inca/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {t('cookies.banner.rejectOptional')}
                </button>
                <Link
                  to="/cookies"
                  className="text-sm text-aji-rojo hover:underline font-medium px-2 py-2.5"
                >
                  {t('cookies.banner.settings')}
                </Link>
                <button
                  onClick={handleDismiss}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700"
                  aria-label={t('cookies.banner.close')}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
