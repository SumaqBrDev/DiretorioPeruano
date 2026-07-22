import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Cookie, X } from '@phosphor-icons/react';
import { motion, AnimatePresence } from 'motion/react';

const COOKIE_CONSENT_KEY = 'conectaperu_cookie_consent';

export const CookieBanner = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!consent) {
      // Small delay so it doesn't appear during page transition
      const timer = setTimeout(() => setVisible(true), 500);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted');
    setVisible(false);
  };

  const handleDismiss = () => {
    setVisible(false);
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
                <div>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {t('brand.name')} utiliza cookies
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 leading-relaxed max-w-prose">
                    Utilizamos cookies estritamente necessários para autenticação e
                    funcionamento básico da plataforma. Não utilizamos cookies de
                    rastreamento ou publicidade. Ao continuar navegando, você concorda
                    com o uso dos nossos cookies.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                <button
                  onClick={handleAccept}
                  className="bg-aji-rojo hover:bg-aji-rojo/90 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition-all active:scale-[0.98] shadow-lg"
                >
                  Aceitar
                </button>
                <button
                  onClick={handleDismiss}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-700"
                  aria-label="Fechar"
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
