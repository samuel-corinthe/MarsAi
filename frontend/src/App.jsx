import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import WpPage from "./pages/WpPage";
import YoutubeUpload from "./pages/YoutubeUpload";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Header />

      <Routes>
        {/* Home = React */}
        <Route path="/" element={<Home />} />

        {/* Toutes les pages WordPress (par slug) */}
        <Route path="/:slug" element={<WpPage />} />

        {/* Page de Concours/Upload YouTube */}
        <Route path="/concours" element={<YoutubeUpload />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
