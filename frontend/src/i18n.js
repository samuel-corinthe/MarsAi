import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import navbarTranslations from "./locales/navbar.json";

i18n.use(initReactI18next).init({
  resources: {
    fr: {
      translation: {
        ...navbarTranslations.fr.nav,
        footer: navbarTranslations.fr.footer,
        prev: "Précédent",
        next: "Suivant",
        home_news: "Actualités",
        jury_title: "Le Jury",
        jury_subtitle:
          "Rencontrez les experts visionnaires de notre sélection officielle.",
        jury_profile_label: "Profil Jury",
        close_profile: "Fermer le profil",
        loading: "Chargement...",
        no_members: "Aucun membre détecté.",
      },
    },
    en: {
      translation: {
        ...navbarTranslations.en.nav,
        footer: navbarTranslations.en.footer,
        prev: "Prev",
        next: "Next",
        home_news: "News",
        jury_title: "The Jury",
        jury_subtitle: "Meet the visionary experts of our official selection.",
        jury_profile_label: "Jury Profile",
        close_profile: "Close Profile",
        loading: "Loading...",
        no_members: "No members detected.",
      },
    },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
