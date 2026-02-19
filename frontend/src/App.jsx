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
import FaqChatbot from "./components/chatbot";

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
          <Route path="/" element={<WpPage isHome={true} />} />
          <Route path="/accueil" element={<WpPage isHome={true} />} />
          <Route path="/home" element={<WpPage isHome={true} />} />
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/a-propos" element={<About />} />
          <Route path="/about" element={<About />} />
          <Route path="/partenaires" element={<Partenaires />} />
          <Route path="/partner" element={<Partenaires />} />
          <Route path="/partners" element={<Partenaires />} />
          <Route path="/films" element={<Gallery />} />
          <Route path="/movies" element={<Gallery />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
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
          <Route path="/deposer-un-film" element={<YoutubeUpload />} />
          <Route path="/submit-a-film" element={<YoutubeUpload />} />
          <Route path="/submit-film" element={<YoutubeUpload />} />
          <Route path="/concours" element={<YoutubeUpload />} />
          <Route path="/:slug" element={<WpPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!hideChrome && <CookieModal />}
      {!hideChrome && <Footer />}
      {!hideChrome && <FaqChatbot />}
    </div>
  );
}
