import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  const isActive = (path) => location.pathname === path;

  const toggleDropdown = (name) => {
    setActiveDropdown(activeDropdown === name ? null : name);
  };

  // Les listes utilisent maintenant t() pour traduire les noms
  const mainNav = [
    { name: t("home"), path: "/accueil", id: "home" },
    { name: t("about.defaultTitle"), path: "/a-propos", id: "about" },
    { name: t("films"), path: "/films", id: "films" },
    { name: t("agenda"), path: "/agenda", id: "agenda" },
    { name: t("callForProjects"), path: "/appel-a-projet", id: "call" },
    { name: t("jury.jury_title"), path: "/jury", id: "jury" },
    {
      name: t("partners.partners_title"),
      path: "/partenaires",
      id: "partners",
    },
  ];

  const moreNav = [
    { name: t("terms_gv"), path: "/cgv", id: "terms_gv" },
    { name: t("terms_gu"), path: "/cgu", id: "terms_gu" },
    { name: t("legal"), path: "/mentions-legales", id: "legal" },
    { name: t("contact"), path: "/contact", id: "contact" },
  ];

  return (
    <>
      <nav
        className={`relative z-50 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-black/95 backdrop-blur-lg shadow-lg shadow-cyan-500/10"
            : "bg-black/80 backdrop-blur-sm"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo (Inchangé) */}
            <Link to="/accueil" className="flex items-center space-x-3 group">
              <div className="relative">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center transform group-hover:scale-110 transition-transform duration-300">
                  <svg
                    className="w-6 h-6 text-black"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                  </svg>
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              </div>
              <div>
                <span
                  className="text-2xl font-black text-white tracking-tight"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  marsAI
                </span>
                <div className="text-[10px] text-cyan-400 font-mono tracking-wider -mt-1">
                  FESTIVAL 2026
                </div>
              </div>
            </Link>

            {/* Navigation Desktop */}
            <div className="hidden lg:flex items-center space-x-1">
              {mainNav.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                    isActive(item.path)
                      ? "text-cyan-400"
                      : "text-gray-300 hover:text-white"
                  }`}
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  {item.name}
                  {isActive(item.path) && (
                    <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-cyan-400 rounded-full"></span>
                  )}
                </Link>
              ))}

              {/* Dropdown "Plus" */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("more")}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg transition-all duration-200 flex items-center space-x-1"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <span>{t("more")}</span>
                  <svg
                    className={`w-4 h-4 transition-transform duration-200 ${activeDropdown === "more" ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                {activeDropdown === "more" && (
                  <div className="absolute right-0 mt-2 w-56 bg-gray-900/95 backdrop-blur-lg rounded-lg shadow-xl border border-gray-800 overflow-hidden animate-fadeIn">
                    {moreNav.map((item) => (
                      <Link
                        key={item.id}
                        to={item.path}
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-cyan-400/10 hover:text-cyan-400 transition-colors duration-200"
                        style={{ fontFamily: "'Inter', sans-serif" }}
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Actions (Sélection Langue + CTA) */}
            <div className="hidden lg:flex items-center space-x-4">
              {/* Sélecteur de langue discret */}
              <div className="flex items-center border-r border-gray-800 pr-4 space-x-2 text-[10px] font-bold">
                <button
                  onClick={() => i18n.changeLanguage("fr")}
                  className={`hover:text-cyan-400 transition-colors ${i18n.language === "fr" ? "text-cyan-400" : "text-gray-500"}`}
                >
                  FR
                </button>
                <span className="text-gray-700">|</span>
                <button
                  onClick={() => i18n.changeLanguage("en")}
                  className={`hover:text-cyan-400 transition-colors ${i18n.language === "en" ? "text-cyan-400" : "text-gray-500"}`}
                >
                  EN
                </button>
              </div>

              <Link
                to="/deposer-un-film"
                className="group relative px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm rounded-full overflow-hidden transition-all duration-300 hover:shadow-lg hover:shadow-green-500/50 hover:scale-105"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <span className="relative z-10 flex items-center space-x-2">
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                    />
                  </svg>
                  <span>{t("submit_film")}</span>
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-emerald-600 to-green-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </Link>
            </div>

            {/* Bouton Menu Mobile (Inchangé) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-lg text-gray-300 hover:text-white hover:bg-gray-900/50 transition-colors duration-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                ) : (
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                )}
              </svg>
            </button>
          </div>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"></div>
      </nav>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="fixed top-20 left-0 right-0 bottom-0 bg-black/95 backdrop-blur-lg overflow-y-auto animate-slideDown">
            <div className="px-4 py-6 space-y-1">
              {/* Ajout langue dans mobile */}
              <div className="flex space-x-4 px-4 mb-4">
                <button
                  onClick={() => i18n.changeLanguage("fr")}
                  className={`text-sm ${i18n.language === "fr" ? "text-cyan-400" : "text-gray-500"}`}
                >
                  Français
                </button>
                <button
                  onClick={() => i18n.changeLanguage("en")}
                  className={`text-sm ${i18n.language === "en" ? "text-cyan-400" : "text-gray-500"}`}
                >
                  English
                </button>
              </div>

              {mainNav.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`block px-4 py-3 text-base font-medium rounded-lg ${
                    isActive(item.path)
                      ? "bg-cyan-400/10 text-cyan-400"
                      : "text-gray-300 hover:bg-gray-900/50"
                  }`}
                >
                  {item.name}
                </Link>
              ))}
              {/* ... reste du menu mobile ... */}
            </div>
          </div>
        </div>
      )}

      {/* Styles (Inchangés) */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideDown { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        .animate-slideDown { animation: slideDown 0.3s ease-out forwards; }
      `}</style>
    </>
  );
};

export default Navbar;
