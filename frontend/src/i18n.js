import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import navbarTranslations from "./locales/navbar.json";

i18n.use(initReactI18next).init({
  resources: {
    fr: {
      translation: {
        ...navbarTranslations.fr.nav,
        footer: navbarTranslations.fr.footer,
        loading: "Chargement...",
        prev: "Précédent",
        next: "Suivant",
        home_news: "Actualités",
        not_found: {
          title: "Page introuvable",
          description: "Désolé, cette page n'existe pas ou a été déplacée.",
          back_home: "Retour à l'accueil",
          see_movies: "Voir les films",
        },
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
        movie_details: {
          not_found: "Film non trouvé",
          back_to_gallery: "Retour à la galerie",
          watch_movie: "Regarder le Film",
          synopsis: "Synopsis",
          ai_stack: "Stack IA",
          no_ai_tools: "Aucun outil IA spécifié.",
          casting: "Casting",
          admin_db_access: "Accès Base de Données",
          admin_note: "Note",
          admin_not_rated: "Non noté",
          admin_manage_note: "Gérer la Note",
          tech_specs: "Fiche Technique",
          global_rating: "Note Globale",
          director: "Réalisateur",
          release_date: "Date de Sortie",
          duration: "Durée",
          modal_title: "Évaluer",
          modal_confirm: "Confirmer",
          modal_delete: "Supprimer la note",
          na: "N/A",
        },
      },
    },
    en: {
      translation: {
        ...navbarTranslations.en.nav,
        footer: navbarTranslations.en.footer,
        loading: "Loading...",
        prev: "Prev",
        next: "Next",
        home_news: "News",
        not_found: {
          title: "Page not found",
          description: "Sorry, this page doesn't exist or has been moved.",
          back_home: "Back to Home",
          see_movies: "View Movies",
        },
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
        movie_details: {
          not_found: "Movie not found",
          back_to_gallery: "Back to gallery",
          watch_movie: "Watch Movie",
          synopsis: "Synopsis",
          ai_stack: "AI Stack",
          no_ai_tools: "No AI tools specified.",
          casting: "Casting",
          admin_db_access: "Database Access",
          admin_note: "Rating",
          admin_not_rated: "Not rated",
          admin_manage_note: "Manage Rating",
          tech_specs: "Technical Specs",
          global_rating: "Global Rating",
          director: "Director",
          release_date: "Release Date",
          duration: "Duration",
          modal_title: "Rate",
          modal_confirm: "Confirm",
          modal_delete: "Delete rating",
          na: "N/A",
        },
      },
    },
  },
  lng: "fr",
  fallbackLng: "fr",
  interpolation: { escapeValue: false },
});

export default i18n;
