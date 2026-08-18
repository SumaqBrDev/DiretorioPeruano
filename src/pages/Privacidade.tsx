// src/pages/Privacidade.tsx
// /privacidade — config-driven Privacy Policy (WU5 task 5.2, design D1/D10).
//
// Renders the ACTIVE privacy_policy version from src/config/legal.ts (the
// single source of truth): sections, version, effective date and sha256 hash
// all come from the registry, so approved wording swaps WITHOUT code changes.
// The legal-status callout reflects `legalApproved` honestly — all current
// registry entries are placeholders pending responsible/DPO review, and this
// page never claims legal approval (no false certification).
//
// Route stays crawlable (static client route, same convention as before).

import { useTranslation } from 'react-i18next';
import { Breadcrumb } from '../components/Breadcrumb';
import { ShieldCheck, WarningCircle, CheckCircle } from '@phosphor-icons/react';
import { motion } from 'motion/react';

import { getLegalDoc } from '../config/legal';

const DOC_ID = 'privacy_policy';

export const Privacidade = () => {
  const { t } = useTranslation();
  const doc = getLegalDoc(DOC_ID);
  const approved = doc?.legalApproved === true;

  return (
    <div className="min-h-screen bg-creme-andino dark:bg-zinc-950">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Breadcrumb
          items={[
            { label: t('nav.home'), href: '/' },
            { label: t('legal.privacy.title') },
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
                <ShieldCheck className="w-6 h-6 text-aji-rojo" weight="duotone" />
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-gray-100 tracking-tighter leading-none">
                {t('legal.privacy.title')}
              </h1>
            </div>
            {doc && (
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {t('legal.meta.version')} {doc.version} · {t('legal.meta.effective')}{' '}
                {doc.effectiveDate} · {t('legal.meta.hash')}{' '}
                <code className="text-xs bg-white dark:bg-zinc-800 px-1.5 py-0.5 rounded border border-oro-inca/20 break-all">
                  {doc.hash}
                </code>
              </p>
            )}
          </div>

          {doc && (
            <div
              className={`mb-8 p-4 rounded-xl border flex items-start gap-3 ${
                approved
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800'
                  : 'bg-oro-inca/10 border-oro-inca/30'
              }`}
            >
              {approved ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 dark:text-emerald-400 mt-0.5 shrink-0" weight="duotone" />
              ) : (
                <WarningCircle className="w-5 h-5 text-oro-inca mt-0.5 shrink-0" weight="duotone" />
              )}
              <p className={`text-sm leading-relaxed ${approved ? 'text-emerald-800 dark:text-emerald-200' : 'text-gray-700 dark:text-gray-300'}`}>
                {approved ? t('legal.status.approved') : t('legal.status.pending')}
              </p>
            </div>
          )}

          {doc ? (
            <div className="grid gap-6">
              {doc.sections.map((section, index) => (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: index * 0.08 }}
                  className="bg-white dark:bg-zinc-800/80 rounded-xl p-6 border border-oro-inca/10 shadow-sm"
                >
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                    {section.title}
                  </h2>
                  <p className="text-gray-600 dark:text-gray-400 leading-relaxed whitespace-pre-line">
                    {section.body}
                  </p>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-white dark:bg-zinc-800/60 rounded-xl border border-oro-inca/10">
              <p className="text-gray-600 dark:text-gray-400">
                Documento não encontrado no registro legal.
              </p>
            </div>
          )}

          <div className="mt-12 text-center">
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Dúvidas sobre privacidade? Entre em contato:{' '}
              <a
                href="mailto:privacidade@conectaperu.com.br"
                className="text-aji-rojo hover:underline font-medium"
              >
                privacidade@conectaperu.com.br
              </a>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
