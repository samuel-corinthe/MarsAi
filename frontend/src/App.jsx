<<<<<<< HEAD
import { useEffect } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import Newsletter from "./pages/Newsletter";
=======
import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import React from "react";
import About from "./pages/About";
>>>>>>> 09310cd5efa47050f1f9dfa31916e738abfab942
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import Gallery from "./pages/Gallery";
import MovieDetails from "./pages/MovieDetails";
import Dashboard from "./pages/Dashboard";
import TestCountdown from "./pages/TestCountdown";
import Partenaires from "./pages/Partenaires";

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
<<<<<<< HEAD
    <div className="min-h-screen flex flex-col">
      {!hideChrome && <Navbar />}
      <div className="flex-1">
        <Routes>
          <Route path="/accueil" element={<WpPage isHome={true} />} />
          <Route path="/home" element={<WpPage isHome={true} />} />
          <Route path="/newsletter" element={<Newsletter />} />
          <Route path="/partenaires" element={<Partenaires />} />
          <Route path="/films" element={<Gallery />} />
          <Route path="/movie/:id" element={<MovieDetails />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/testcountdown" element={<TestCountdown />} />
          <Route path="/:slug" element={<WpPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </div>
      {!hideChrome && <Footer />}
    </div>
=======
    <>
      <Header />

      <Routes>
        {/* Home = React */}
        <Route path="/" element={<Home />} />
 
        {/* About = React */}
        <Route path="/about" element={<About />} />

        {/* Toutes les pages WordPress (par slug) */}
        <Route path="/:slug" element={<WpPage />} />
          
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
>>>>>>> 09310cd5efa47050f1f9dfa31916e738abfab942
  );
}
