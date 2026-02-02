import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import ruTranslation from './locales/ru/translation.json';
import kkTranslation from './locales/kk/translation.json';

const savedLanguage = localStorage.getItem('language') || 'ru';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ruTranslation },
      kk: { translation: kkTranslation },
    },
    lng: savedLanguage,
    fallbackLng: 'ru',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
