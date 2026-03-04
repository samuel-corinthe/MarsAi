import { lazy, Suspense, useEffect } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CookieModal from "./components/CookieModal";

const Newsletter = lazy(() => import("./pages/Newsletter"));
const About = lazy(() => import("./pages/About"));
const Partenaires = lazy(() => import("./pages/Partenaires"));
const WpPage = lazy(() => import("./pages/WpPage"));
const YoutubeUpload = lazy(() => import("./pages/YoutubeUpload"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Gallery = lazy(() => import("./pages/Gallery"));
const MovieDetails = lazy(() => import("./pages/MovieDetails"));
const DashboardEntry = lazy(() => import("./pages/DashboardEntry"));
const TestCountdown = lazy(() => import("./pages/TestCountdown"));

export default function App() {
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const hideChrome = location.pathname.startsWith("/dashboard");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [location.pathname, location.search]);

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
        <Suspense
          fallback={(
            <div
              className="p-8 text-center text-sm text-slate-400"
              dir={i18n.dir(i18n.language)}
            >
              {t("common.loading")}
            </div>
          )}
        >
          <Routes>
            <Route path="/" element={<WpPage isHome={true} />} />
            <Route path="/accueil" element={<WpPage isHome={true} />} />
            <Route path="/home" element={<WpPage isHome={true} />} />
            <Route path="/en/home" element={<Navigate to="/home" replace />} />
            <Route path="/ar/home" element={<WpPage isHome={true} />} />
            <Route path="/newsletter" element={<Newsletter />} />
            <Route path="/en/newsletter" element={<Navigate to="/newsletter" replace />} />
            <Route path="/ar/newsletter" element={<Newsletter />} />
            <Route path="/a-propos" element={<About />} />
            <Route path="/about" element={<About />} />
            <Route path="/en/about" element={<Navigate to="/about" replace />} />
            <Route path="/ar/about" element={<About />} />
            <Route path="/partenaires" element={<Partenaires />} />
            <Route path="/partner" element={<Partenaires />} />
            <Route path="/partners" element={<Partenaires />} />
            <Route path="/en/partners" element={<Navigate to="/partners" replace />} />
            <Route path="/ar/partners" element={<Partenaires />} />
            <Route path="/films" element={<Gallery />} />
            <Route path="/movies" element={<Gallery />} />
            <Route path="/en/movies" element={<Navigate to="/movies" replace />} />
            <Route path="/ar/movies" element={<Gallery />} />
            <Route path="/movie/:id" element={<MovieDetails />} />
            <Route path="/en/movie/:id" element={<MovieDetails />} />
            <Route path="/ar/movie/:id" element={<MovieDetails />} />
            <Route path="/dashboard" element={<DashboardEntry />} />
            <Route path="/testcountdown" element={<TestCountdown />} />
            <Route
              path="/en/call-for-project"
              element={<Navigate to="/call-for-project" replace />}
            />
            <Route
              path="/en/call-for-projects"
              element={<Navigate to="/call-for-project" replace />}
            />
            <Route
              path="/call-for-project"
              element={<WpPage fixedSlug="call-for-project" />}
            />
            <Route
              path="/call-for-projects"
              element={<WpPage fixedSlug="call-for-project" />}
            />
            <Route
              path="/ar/call-for-project"
              element={<WpPage fixedSlug="call-for-project" />}
            />
            <Route
              path="/ar/call-for-projects"
              element={<Navigate to="/ar/call-for-project" replace />}
            />
            <Route path="/deposer-un-film" element={<YoutubeUpload />} />
            <Route path="/submit-a-film" element={<YoutubeUpload />} />
            <Route path="/submit-film" element={<YoutubeUpload />} />
            <Route path="/concours" element={<YoutubeUpload />} />
            <Route path="/en/submit-film" element={<Navigate to="/submit-film" replace />} />
            <Route path="/ar/submit-film" element={<YoutubeUpload />} />
            <Route path="/en/:slug" element={<WpPage />} />
            <Route path="/ar/:slug" element={<WpPage />} />
            <Route path="/:slug" element={<WpPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </div>
      {!hideChrome && <CookieModal />}
      {!hideChrome && <Footer />}
    </div>
  );
}
