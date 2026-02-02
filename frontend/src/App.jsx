import { Routes, Route } from "react-router-dom";
import Header from "./components/Header";
 
import Home from "./pages/Home";
import Newsletter from "./pages/Newsletter";

import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";

export default function App() {
  return (
    <>
      <Header />

      <Routes>
        {/* Home = React */}
        <Route path="/" element={<Home />} />
        <Route path="/newsletter" element={<Newsletter />} />


        {/* Toutes les pages WordPress (par slug) */}
        <Route path="/:slug" element={<WpPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
      
      
    </>
  );
}
