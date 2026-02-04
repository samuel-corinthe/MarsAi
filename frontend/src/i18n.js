import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import navbarTranslations from './locales/navbar.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      fr: {
        translation: {
          ...navbarTranslations.fr
        }
      },
      en: {
        translation: {
          ...navbarTranslations.en
        }
      }
    },
    lng: 'fr',
    fallbackLng: 'fr',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;