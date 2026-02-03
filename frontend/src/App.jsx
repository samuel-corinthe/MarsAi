import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Home from "./pages/Home";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Routes>
          {/* Home = React */}
          <Route path="/" element={<Home />} />

          {/* Toutes les pages WordPress (par slug) */}
          <Route path="/:slug" element={<WpPage />} />
          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
