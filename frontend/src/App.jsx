import { Routes, Route } from "react-router-dom";
<<<<<<< HEAD
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";

=======
import Navbar from './components/Navbar';
>>>>>>> e166919c47d5d9fdd0437d426572526463f29fac
import Home from "./pages/Home";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Navbar />   
      <Routes>
        {/* Home = React */}
        <Route path="/" element={<Home />} />
<<<<<<< HEAD
        <Route path="/cgv" element={<CGV />} />
        <Route path="/cgu" element={<CGU />} />
=======
>>>>>>> e166919c47d5d9fdd0437d426572526463f29fac
        {/* Toutes les pages WordPress (par slug) */}
        <Route path="/:slug" element={<WpPage />} />
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      <Footer />
    </>
  );
}