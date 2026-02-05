import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Newsletter from "./pages/Newsletter";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import CGV from "./pages/CGV";
import CGU from "./pages/CGU";
import Gallery from "./pages/Gallery";
import MovieDetails from "./pages/MovieDetails";

export default function App() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<WpPage isHome={true} />} />
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/cgv" element={<CGV />} />
          <Route path="/cgu" element={<CGU />} />
          <Route path="/films" element={<Gallery />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/:slug" element={<WpPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}
