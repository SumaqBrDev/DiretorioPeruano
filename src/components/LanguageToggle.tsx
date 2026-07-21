import { useTranslation } from 'react-i18next';

export const LanguageToggle = () => {
  const { i18n } = useTranslation();

  const toggleLanguage = () => {
    const newLang = i18n.language === 'pt-BR' ? 'es-PE' : 'pt-BR';
    i18n.changeLanguage(newLang);
  };

  const isPortuguese = i18n.language === 'pt-BR';

  return (
    <button
      onClick={toggleLanguage}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-oro-inca/30 text-sm text-gray-700 dark:text-gray-300 hover:border-aji-rojo/50 hover:text-aji-rojo transition-all focus:outline-none focus:ring-2 focus:ring-aji-rojo/30"
      aria-label={isPortuguese ? 'Mudar para espanhol' : 'Cambiar a portugués'}
    >
      <span className="text-base" role="img" aria-hidden="true">
        {isPortuguese ? '🇧🇷' : '🇵🇪'}
      </span>
      <span className="font-medium">{isPortuguese ? 'PT' : 'ES'}</span>
    </button>
  );
};
