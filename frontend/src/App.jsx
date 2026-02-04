import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Header />

      <Routes>
        {/* Home depuis WordPress */}
        <Route path="/" element={<WpPage isHome={true} />} />

        {/* Toutes les pages WordPress (par slug) */}
        <Route path="/:slug" element={<WpPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
