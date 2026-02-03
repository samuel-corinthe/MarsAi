import { useEffect } from "react"; // Ajout de useEffect
import { Routes, Route, useLocation } from "react-router-dom"; // Ajout de useLocation
import Header from "./components/Header";
import Home from "./pages/Home";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import { CookiesProvider } from "react-cookie";
import CookieModal from "./components/CookieModal";

export default function App() {
  const location = useLocation();

  useEffect(() => {
    // Cette fonction envoie la vue à GA4 à chaque changement de route
    if (window.gtag) {
      window.gtag("config", "G-5ZGJKEP00R", {
        page_path: location.pathname + location.search,
      });
    }
  }, [location]);

  return (
    <CookiesProvider>
      <Header />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/:slug" element={<WpPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <CookieModal />
    </CookiesProvider>
  );
}
