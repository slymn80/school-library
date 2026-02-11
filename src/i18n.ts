import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ruTranslation from './locales/ru/translation.json';
import kkTranslation from './locales/kk/translation.json';
import trTranslation from './locales/tr/translation.json';
import enTranslation from './locales/en/translation.json';

const savedLanguage = localStorage.getItem('language') || 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      kk: { translation: kkTranslation },
      ru: { translation: ruTranslation },
      tr: { translation: trTranslation },
      en: { translation: enTranslation },
    },
    lng: savedLanguage,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
