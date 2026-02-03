import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import { CookiesProvider } from "react-cookie";
import CookieModal from "./components/CookieModal";

export default function App() {
  return (
    <CookiesProvider>
      <Header />

      <main>
        <Routes>
          {/* Home = React */}
          <Route path="/" element={<Home />} />

          {/* Toutes les pages WordPress (par slug) */}
          <Route path="/:slug" element={<WpPage />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>

      <CookieModal />
    </CookiesProvider>
  );
}
