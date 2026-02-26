import { useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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

  return (
    <div className="min-h-screen flex flex-col">
      {!hideChrome && <Navbar />}
      <div className="flex-1">
        <Routes>
          {/* --- ACCUEIL --- */}
          <Route path="/" element={<WpPage isHome={true} />} />
          <Route path="/accueil" element={<WpPage isHome={true} />} />
          <Route path="/home" element={<WpPage isHome={true} />} />
          <Route path="/en/home" element={<WpPage isHome={true} />} />
          <Route
            path="/ar/home"
            element={<WpPage fixedSlug="home-ar" isHome={true} />}
          />

          {/* --- A PROPOS --- */}
          <Route path="/a-propos" element={<About />} />
          <Route path="/about" element={<About />} />
          <Route path="/en/about" element={<About />} />
          <Route path="/ar/about" element={<About />} />

          {/* --- FILMS (GALLERY) --- */}
          <Route path="/films" element={<Gallery />} />
          <Route path="/movies" element={<Gallery />} />
          <Route path="/en/movies" element={<Gallery />} />
          <Route path="/ar/movies" element={<Gallery />} />
          <Route path="/movie/:id" element={<MovieDetails />} />

          {/* --- AGENDA (SCHEDULE) --- */}
          <Route path="/agenda" element={<WpPage fixedSlug="agenda" />} />
          <Route path="/en/schedule" element={<WpPage fixedSlug="agenda" />} />
          <Route path="/ar/schedule" element={<WpPage fixedSlug="agenda" />} />

          {/* --- JURY --- */}
          <Route path="/jury" element={<WpPage fixedSlug="jury" />} />
          <Route path="/en/jury-eng" element={<WpPage fixedSlug="jury" />} />
          <Route path="/ar/jury-eng" element={<WpPage fixedSlug="jury" />} />

          {/* --- PARTENAIRES --- */}
          <Route path="/partenaires" element={<Partenaires />} />
          <Route path="/en/partners" element={<Partenaires />} />
          <Route path="/ar/partners" element={<Partenaires />} />

          {/* --- APPEL A PROJET --- */}
          <Route
            path="/appel-a-projet"
            element={<WpPage fixedSlug="call-for-project" />}
          />
          <Route
            path="/call-for-project"
            element={<WpPage fixedSlug="call-for-project" />}
          />
          <Route
            path="/en/call-for-project"
            element={<WpPage fixedSlug="call-for-project" />}
          />
          <Route
            path="/ar/call-for-project"
            element={<WpPage fixedSlug="call-for-project" />}
          />

          {/* --- SOUMISSION FILM --- */}
          <Route path="/deposer-un-film" element={<YoutubeUpload />} />
          <Route path="/submit-film" element={<YoutubeUpload />} />
          <Route path="/en/submit-film" element={<YoutubeUpload />} />
          <Route path="/ar/submit-film" element={<YoutubeUpload />} />

          {/* --- CGU (Terms of Use) --- */}
          <Route path="/cgu" element={<WpPage fixedSlug="cgu" />} />
          <Route path="/en/gcu" element={<WpPage fixedSlug="cgu" />} />
          <Route path="/ar/gcu" element={<WpPage fixedSlug="cgu" />} />

          {/* --- CGV (Terms of Sale) --- */}
          <Route path="/cgv" element={<WpPage fixedSlug="cgv" />} />
          <Route path="/en/tos" element={<WpPage fixedSlug="cgv" />} />
          <Route path="/ar/tos" element={<WpPage fixedSlug="cgv" />} />

          {/* --- MENTIONS LEGALES --- */}
          <Route
            path="/mentions-legales"
            element={<WpPage fixedSlug="mentions-legales" />}
          />
          <Route
            path="/en/legal-notice"
            element={<WpPage fixedSlug="mentions-legales" />}
          />
          <Route
            path="/ar/legal-notice"
            element={<WpPage fixedSlug="mentions-legales" />}
          />

          {/* --- TECHNIQUE --- */}
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/dashboard" element={<DashboardEntry />} />
          <Route path="/testcountdown" element={<TestCountdown />} />

          <Route path="/:slug" element={<WpPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!hideChrome && <CookieModal />}
      {!hideChrome && <Footer />}
    </div>
  );
}
