import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import navbarTranslations from "./locales/navbar.json";

i18n.use(initReactI18next).init({
  resources: {
    fr: {
      translation: {
        ...navbarTranslations.fr.nav,
        footer: navbarTranslations.fr.footer,
      },
    },
    en: {
      translation: {
        ...navbarTranslations.en.nav,
        footer: navbarTranslations.en.footer,
      },
    },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
