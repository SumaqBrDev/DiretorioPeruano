// src/pages/Cookies.tsx
// /cookies page — category-based cookie preferences (WU4 task 4.4, design
// D7/D9). SEO-crawlable route (client-side route with real <a> links, same
// convention as /termos and /privacidade).
//
// The panel reflects the CURRENT saved preferences (local cache + server row
// when authenticated) and lets the user change them at any time. Saving
// applies the choice to the script gate immediately, persists the versioned
// record locally, and syncs to POST /api/consent/preferences when
// authenticated (best-effort). The full legal Cookie Policy text is owned by
// WU5 (config-driven legal pages); this page links to the Privacy Policy
// until then.

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@clerk/clerk-react';
import { motion } from 'motion/react';
import { Cookie, Check } from '@phosphor-icons/react';

import { Breadcrumb } from '../components/Breadcrumb';
import { useConsentStore } from '../stores/useConsentStore';
import { COOKIE_CATEGORIES } from '../config/legal';

export const Cookies = () => {
  const { t, i18n } = useTranslation();
  const { getToken } = useAuth();
  const { preferences, hydrated, loadPreferences, savePreferences } = useConsentStore();

  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

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

  // Initialize the toggles from the current saved preferences once hydrated.
  useEffect(() => {
    if (!hydrated) return;
    const initial: Record<string, boolean> = {};
    for (const cat of COOKIE_CATEGORIES) {
      if (cat.essential) continue;
      initial[cat.id] = preferences?.categories[cat.id] === true;
    }
    setToggles(initial);
  }, [hydrated, preferences]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setSaved(false);
    try {
      const token = await getToken();
      await savePreferences({ ...toggles, essential: true }, { token, locale: i18n.language });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-creme-andino dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('cookies.page.title') },
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
                <Cookie className="w-6 h-6 text-aji-rojo" weight="duotone" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tighter leading-none">
                {t('cookies.page.title')}
              </h1>
            </div>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl">
              {t('cookies.page.subtitle')}
            </p>
          </div>

          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            {t('cookies.page.categoriesTitle')}
          </h2>

          <div className="grid gap-4 mb-8">
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
                      onChange={(e) => setToggles((s) => ({ ...s, [cat.id]: e.target.checked }))}
                      className="h-4 w-4 accent-aji-rojo"
                    />
                  </label>
                </motion.div>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="bg-aji-rojo hover:bg-aji-rojo/90 text-white text-sm font-medium px-6 py-3 rounded-xl transition-all active:scale-[0.98] shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? t('cookies.page.saving') : t('cookies.page.save')}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {t('cookies.page.saved')}
              </span>
            )}
            <Link
              to="/privacidade"
              className="text-sm text-aji-rojo hover:underline font-medium px-2 py-3"
            >
              {t('cookies.page.privacyLink')}
            </Link>
          </div>

          <div className="mt-8 p-5 bg-white dark:bg-zinc-800/60 rounded-xl border border-oro-inca/10">
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {t('cookies.page.note')}
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
