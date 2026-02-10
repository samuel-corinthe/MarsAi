import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CookieModal from "./components/CookieModal";
import Newsletter from "./pages/Newsletter";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import Gallery from "./pages/Gallery";
import MovieDetails from "./pages/MovieDetails";
import Dashboard from "./pages/Dashboard";
import TestCountdown from "./pages/TestCountdown";
import FilmDetails from "./pages/FilmDetails";

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
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/films" element={<Gallery />} />
          <Route path="/films/:slug" element={<FilmDetails />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/dashboard" element={<Dashboard />} />
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
