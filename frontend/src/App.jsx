import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import Upload from "./pages/Upload";

export default function App() {
  return (
    <>
      <Header />

      <Routes>
        {/* Home et toutes les pages WordPress (par slug) */}
        <Route path="/" element={<WpPage isHome={true} />} />

        <Route path="/upload" element={<Upload />} />
        <Route path="/:slug" element={<WpPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
