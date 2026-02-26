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

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Correction : Bloquer le scroll du corps de la page quand le menu mobile est ouvert
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
  }, [mobileMenuOpen]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
    document.dir = i18n.language === "ar" ? "rtl" : "ltr";
  }, [location.pathname, i18n.language]);

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
      contact: { fr: "/contact", en: "/en/contact", ar: "/ar/contact" }, // Ajout Contact
    };
    return paths[pageKey]?.[lang] || paths[pageKey]?.["en"] || "/";
  };

  const handleLanguageChange = (nextLang) => {
    if (nextLang === i18n.language) return;
    i18n.changeLanguage(nextLang).then(() => {
      // On redirige vers la home pour simplifier ou tu peux garder ta logique de reversePaths
      navigate(getLocalizedPath("home"), { replace: true });
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
    {
      name: t("nav.contact") || "Contact",
      path: getLocalizedPath("contact"),
      id: "contact",
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
        className={`fixed top-0 w-full z-[70] transition-all duration-300 ${isScrolled || mobileMenuOpen ? "bg-black shadow-xl" : "bg-black/80 backdrop-blur-sm"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link
              to={getLocalizedPath("home")}
              className="flex items-center space-x-3 group rtl:space-x-reverse z-[80]"
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
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
                  Festival 2026
                </span>
              </div>
            </Link>

            {/* Desktop Nav */}
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
              {/* Dropdown More Desktop ... (inchangé) */}
            </div>

            {/* Desktop Lang & CTA */}
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

            {/* Mobile Burger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden z-[80] p-2 text-gray-400 hover:text-white transition-colors"
            >
              <svg
                className="w-8 h-8"
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
      </nav>

      {/* Fullscreen Mobile Menu */}
      <div
        className={`fixed inset-0 z-[60] bg-black transform transition-transform duration-500 ease-in-out ${mobileMenuOpen ? "translate-y-0" : "-translate-y-full"} lg:hidden`}
      >
        <div className="flex flex-col h-full pt-28 pb-10 px-8 overflow-y-auto">
          <div className="flex flex-col space-y-6">
            {mainNav.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`text-3xl font-bold tracking-tight ${location.pathname === item.path ? "text-cyan-400" : "text-white"}`}
              >
                {item.name}
              </Link>
            ))}
            <hr className="border-gray-800" />
            <div className="grid grid-cols-1 gap-4">
              {moreNav.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-400 text-lg"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>

          <div className="mt-auto pt-10 flex flex-col gap-8">
            <Link
              to={getLocalizedPath("submit")}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center font-bold rounded-xl"
            >
              {t("nav.submitFilm")}
            </Link>

            <div className="flex justify-center items-center gap-8">
              {["fr", "en", "ar"].map((l) => (
                <button
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`uppercase text-xl font-black ${i18n.language === l ? "text-cyan-400" : "text-gray-600"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Navbar;
