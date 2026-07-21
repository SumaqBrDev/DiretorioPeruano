import { create } from 'zustand';
import i18n from '../i18n/config';

interface I18nState {
  language: 'pt-BR' | 'es-PE';
  setLanguage: (lang: 'pt-BR' | 'es-PE') => void;
}

export const useI18nStore = create<I18nState>((set) => ({
  language: (i18n.language as 'pt-BR' | 'es-PE') || 'pt-BR',
  setLanguage: (lang) => {
    i18n.changeLanguage(lang);
    set({ language: lang });
  },
}));
