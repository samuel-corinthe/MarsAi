import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import CGV from './pages/CGV';
import CGU from './pages/CGU';

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        {/* Home = React */}
        <Route path="/" element={<Home />} />
        
        {/* Pages statiques  */}
        <Route path="/cgv" element={<CGV />} />
        <Route path="/cgu" element={<CGU />} />
        
        {/* Toutes les pages WordPress (par slug) */}
        <Route path="/:slug" element={<WpPage />} />
        
        {/* 404  */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}