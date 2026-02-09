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
        jury: {
          jury_title: "Jury",
          jury_subtitle:
            "Rencontrez les experts visionnaires de notre sélection officielle.",
          jury_profile_label: "Profil Jury",
          close_profile: "Fermer le profil",
          loading: "Chargement...",
          no_members: "Aucun membre détecté.",
        },

        gallery: {
          title_accent: "nos Merveilles",
          top_movies_subtitle: "Découvrez les 5 meilleurs films",
          search_placeholder: "Rechercher un film...",
          no_results: "Aucun résultat trouvé",
        },
        genres: {
          all: "Tous",
          action: "Action",
          "sci-fi": "Science-Fiction",
          adventure: "Aventure",
          fantasy: "Fantastique",
          drama: "Drame",
        },
      },
    },
    en: {
      translation: {
        ...navbarTranslations.en.nav,
        footer: navbarTranslations.en.footer,
        prev: "Prev",
        next: "Next",
        home_news: "News",
        jury: {
          jury_title: "Jury",
          jury_subtitle:
            "Meet the visionary experts of our official selection.",
          jury_profile_label: "Jury Profile",
          close_profile: "Close Profile",
          loading: "Loading...",
          no_members: "No members detected.",
        },

        gallery: {
          title_accent: "our Wonders",
          top_movies_subtitle: "Discover the top 5 movies",
          search_placeholder: "Search for a movie...",
          no_results: "No results found",
        },
        genres: {
          all: "All",
          action: "Action",
          "sci-fi": "Sci-Fi",
          adventure: "Adventure",
          fantasy: "Fantasy",
          drama: "Drama",
        },
      },
    },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
