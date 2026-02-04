import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Gallery from "./pages/Gallery";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import MovieDetails from "./pages/MovieDetails";

export default function App() {
  return (
    <>
      <Header />

      <Routes>
        {/* Home = React */}
        <Route path="/" element={<Home />} />

        {/* Toutes les pages WordPress (par slug) */}
        <Route path="/:slug" element={<WpPage />} />

        <Route path="/gallery" element={<Gallery />} />
        <Route path="/movie" element={<MovieDetails />} />
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
