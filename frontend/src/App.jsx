import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import WpPage from "./pages/WpPage";
import NotFound from "./pages/NotFound";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const location = useLocation();
  const hideHeader = location.pathname.startsWith("/dashboard");

  return (
    <>
      {!hideHeader && <Header />}

      <Routes>
        {/* Home = React */}
        <Route path="/" element={<Home />} />

        {/* Dashboard Admin + Super Admin */}
        <Route path="/dashboard" element={<Dashboard />} />

        {/* Toutes les pages WordPress (par slug) */}
        <Route path="/:slug" element={<WpPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
