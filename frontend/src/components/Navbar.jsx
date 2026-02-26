import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);

  // Détection du scroll pour le style
  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Gestion de la direction (RTL) et fermeture menus sur navigation
  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    document.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [location.pathname, i18n.language]);

  // --- LOGIQUE DE ROUTAGE ---

  // On définit les routes de base par langue pour matcher App.js
  const getLocalizedPath = (pageKey) => {
    const lang = i18n.language;
    const paths = {
      home: { fr: "/accueil", en: "/en/home", ar: "/ar/home" },
      about: { fr: "/a-propos", en: "/en/about", ar: "/ar/about" },
      movies: { fr: "/films", en: "/en/movies", ar: "/ar/films" },
      schedule: { fr: "/agenda", en: "/en/schedule", ar: "/ar/schedule" },
      call: {
        fr: "/appel-a-projet",
        en: "/en/call-for-project",
        ar: "/ar/call-for-project",
      },
      jury: { fr: "/jury", en: "/en/jury", ar: "/ar/jury" },
      partners: { fr: "/partenaires", en: "/en/partners", ar: "/ar/partners" },
      submit: {
        fr: "/deposer-un-film",
        en: "/en/submit-film",
        ar: "/ar/submit-film",
      },
      tos: { fr: "/cgv", en: "/en/tos", ar: "/ar/tos" },
      gcu: { fr: "/cgu", en: "/en/gcu", ar: "/ar/gcu" },
      legal: {
        fr: "/mentions-legales",
        en: "/en/legal-notice",
        ar: "/ar/legal-notice",
      },
    };
    return paths[pageKey][lang] || paths[pageKey]["en"];
  };

  const handleLanguageChange = (nextLang) => {
    if (nextLang === i18n.language) return;

    // Mapping inverse pour retrouver la clé de page depuis l'URL actuelle
    const reversePaths = {
      "/accueil": "home",
      "/en/home": "home",
      "/ar/home-ar": "home",
      "/home": "home",
      "/a-propos": "about",
      "/about": "about",
      "/en/about": "about",
      "/ar/about": "about",
      "/films": "movies",
      "/movies": "movies",
      "/en/movies": "movies",
      "/ar/films": "films",
      "/agenda": "schedule",
      "/schedule": "schedule",
      "/en/schedule": "schedule",
      "/ar/schedule": "schedule",
      "/appel-a-projet": "call",
      "/call-for-project": "call",
      "/en/call-for-project": "call",
      "/ar/call-for-project": "call",
      "/jury": "jury",
      "/en/jury": "jury",
      "/ar/jury": "jury",
      "/partenaires": "partners",
      "/en/partners": "partners",
      "/ar/partners": "partners",
    };

    const currentPageKey = reversePaths[location.pathname] || "home";

    i18n.changeLanguage(nextLang).then(() => {
      const nextPath = getLocalizedPath(currentPageKey);
      navigate(nextPath, { replace: true });
    });
  };

  const mainNav = [
    { name: t("nav.home"), path: getLocalizedPath("home"), id: "home" },
    { name: t("nav.about"), path: getLocalizedPath("about"), id: "about" },
    { name: t("nav.films"), path: getLocalizedPath("movies"), id: "films" },
    { name: t("nav.agenda"), path: getLocalizedPath("schedule"), id: "agenda" },
    {
      name: t("nav.callForProjects"),
      path: getLocalizedPath("call"),
      id: "call",
    },
    { name: t("nav.jury"), path: getLocalizedPath("jury"), id: "jury" },
    {
      name: t("nav.partners"),
      path: getLocalizedPath("partners"),
      id: "partners",
    },
  ];

  const moreNav = [
    { name: t("nav.legal"), path: getLocalizedPath("legal"), id: "legal" },
    { name: t("nav.terms_gv"), path: getLocalizedPath("tos"), id: "tos" },
    { name: t("nav.terms_gu"), path: getLocalizedPath("gcu"), id: "gcu" },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-[70] transition-all duration-300 ${isScrolled ? "bg-black/95 shadow-xl" : "bg-black/80 backdrop-blur-sm"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link
              to={getLocalizedPath("home")}
              className="flex items-center space-x-3 group rtl:space-x-reverse"
            >
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center transform group-hover:rotate-12 transition-transform">
                <svg
                  className="w-6 h-6 text-black"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </div>
              <div className="flex flex-col">
                <span
                  className="text-2xl font-black text-white leading-none"
                  style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                >
                  marsAI
                </span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest">
                  FESTIVAL 2026
                </span>
              </div>
            </Link>

            {/* Menu Desktop */}
            <div className="hidden lg:flex items-center space-x-1 rtl:space-x-reverse">
              {mainNav.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${location.pathname === item.path ? "text-cyan-400" : "text-gray-300 hover:text-white"}`}
                >
                  {item.name}
                </Link>
              ))}

              {/* Dropdown More */}
              <div className="relative">
                <button
                  onClick={() =>
                    setActiveDropdown(activeDropdown === "more" ? null : "more")
                  }
                  className="px-3 py-2 text-sm font-medium text-gray-300 flex items-center gap-1 hover:text-white transition-colors"
                >
                  <span>{t("nav.more")}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${activeDropdown === "more" ? "rotate-180" : ""}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {activeDropdown === "more" && (
                  <div
                    className={`absolute ${i18n.language === "ar" ? "left-0" : "right-0"} mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl overflow-hidden`}
                  >
                    {moreNav.map((item) => (
                      <Link
                        key={item.id}
                        to={item.path}
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-cyan-400"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sélecteur Langue & CTA */}
            <div className="hidden lg:flex items-center space-x-4 rtl:space-x-reverse">
              <div className="flex items-center border-x border-gray-800 px-4 space-x-3 rtl:space-x-reverse text-[11px] font-bold">
                {["fr", "en", "ar"].map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLanguageChange(l)}
                    className={`hover:text-cyan-400 transition-colors uppercase ${i18n.language === l ? "text-cyan-400" : "text-gray-500"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>

              <Link
                to={getLocalizedPath("submit")}
                className="px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-full hover:shadow-[0_0_15px_rgba(16,185,129,0.5)] transition-all"
              >
                {t("nav.submitFilm")}
              </Link>
            </div>

            {/* Mobile Burger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-400"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                {mobileMenuOpen ? (
                  <path d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] bg-black pt-24 px-6 lg:hidden">
          <div className="flex flex-col space-y-4">
            {[...mainNav, ...moreNav].map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`text-lg font-medium border-b border-gray-900 pb-2 ${location.pathname === item.path ? "text-cyan-400" : "text-gray-300"}`}
              >
                {item.name}
              </Link>
            ))}
            <div className="flex space-x-6 pt-4 rtl:space-x-reverse">
              {["fr", "en", "ar"].map((l) => (
                <button
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`uppercase font-bold ${i18n.language === l ? "text-cyan-400" : "text-gray-600"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navbar;
