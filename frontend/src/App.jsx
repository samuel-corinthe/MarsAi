import { useEffect } from "react";
import {
  Routes,
  Route,
  useLocation,
  useParams,
  Outlet,
} from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CookieModal from "./components/CookieModal";
import Newsletter from "./pages/Newsletter";
import About from "./pages/About";
import Partenaires from "./pages/Partenaires";
import WpPage from "./pages/WpPage";
import YoutubeUpload from "./pages/YoutubeUpload";
import NotFound from "./pages/NotFound";
import Gallery from "./pages/Gallery";
import MovieDetails from "./pages/MovieDetails";
import DashboardEntry from "./pages/DashboardEntry";
import TestCountdown from "./pages/TestCountdown";

// Gestionnaire de Langue et Direction (RTL/LTR)
const LangConfig = () => {
  const { lang } = useParams();

  useEffect(() => {
    // Si lang est absent, on considère que c'est "fr"
    const current = lang || "fr";
    document.documentElement.lang = current;
    document.documentElement.dir = current === "ar" ? "rtl" : "ltr";
  }, [lang]);

  return <Outlet />;
};

export default function App() {
  const location = useLocation();
  const hideChrome = location.pathname.startsWith("/dashboard");

  useEffect(() => {
    if (window.gtag) {
      window.gtag("config", "G-5ZGJKEP00R", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  // Définition commune des routes pour éviter la répétition
  const routesDefinition = (
    <>
      {/* ACCUEIL */}
      <Route index element={<WpPage isHome={true} />} />
      <Route path="accueil" element={<WpPage isHome={true} />} />
      <Route path="home" element={<WpPage isHome={true} />} />

      {/* PAGES STATIQUES */}
      <Route path="newsletter" element={<Newsletter />} />
      <Route path="a-propos" element={<About />} />
      <Route path="about" element={<About />} />
      <Route path="about-ar" element={<About />} />

      <Route path="partenaires" element={<Partenaires />} />
      <Route path="partner" element={<Partenaires />} />
      <Route path="شركاء" element={<Partenaires />} />

      {/* FILMS / GALERIE */}
      <Route path="films" element={<Gallery />} />
      <Route path="movies" element={<Gallery />} />
      <Route path="gallery" element={<Gallery />} />
      <Route path="movie/:id" element={<MovieDetails />} />

      {/* JURY & AGENDA */}
      <Route path="jury" element={<WpPage fixedSlug="jury" />} />
      <Route path="jury-eng" element={<WpPage fixedSlug="jury" />} />
      <Route path="agenda" element={<WpPage fixedSlug="agenda" />} />
      <Route path="schedule" element={<WpPage fixedSlug="schedule" />} />

      {/* CONTACT */}
      <Route path="contact" element={<WpPage fixedSlug="contact" />} />

      {/* APPEL A PROJETS (Slug rectifié selon ta structure WP) */}
      <Route
        path="appel-a-projet"
        element={<WpPage fixedSlug="appel-a-projet" />}
      />
      <Route
        path="call-for-project"
        element={<WpPage fixedSlug="call-for-project" />}
      />

      {/* SOUMISSION */}
      <Route path="deposer-un-film" element={<YoutubeUpload />} />
      <Route path="submit-film" element={<YoutubeUpload />} />
      <Route path="submit-a-film" element={<YoutubeUpload />} />

      {/* LEGAL */}
      <Route path="cgv" element={<WpPage fixedSlug="cgv" />} />
      <Route path="tos" element={<WpPage fixedSlug="tos" />} />
      <Route
        path="mentions-legales"
        element={<WpPage fixedSlug="mentions-legales" />}
      />
      <Route
        path="legal-notice"
        element={<WpPage fixedSlug="legal-notice" />}
      />

      <Route path="testcountdown" element={<TestCountdown />} />

      {/* WP DYNAMIQUE (Doit être en dernier) */}
      <Route path=":slug" element={<WpPage />} />
    </>
  );

  return (
    <div className="min-h-screen flex flex-col">
      {!hideChrome && <Navbar />}
      <div className="flex-1">
        <Routes>
          {/* 1. DASHBOARD (Hors i18n) */}
          <Route path="/dashboard" element={<DashboardEntry />} />

          {/* 2. ROUTES AVEC LANGUE (en/ar) */}
          <Route path="/:lang" element={<LangConfig />}>
            {/* Ici, l'index captera exactement "/en" ou "/ar" */}
            <Route index element={<WpPage isHome={true} />} />
            {routesDefinition}
          </Route>

          {/* 3. ROUTES PAR DÉFAUT (fr) */}
          <Route path="/" element={<LangConfig />}>
            <Route index element={<WpPage isHome={true} />} />
            {routesDefinition}
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!hideChrome && <CookieModal />}
      {!hideChrome && <Footer />}
    </div>
  );
}
