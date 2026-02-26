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
      contact: { fr: "/contact", en: "/en/contact", ar: "/ar/contact" },
    };
    return paths[pageKey]?.[lang] || paths[pageKey]?.["en"] || "/";
  };

  const handleLanguageChange = (lang) => {
    i18n.changeLanguage(lang);
    setMobileMenuOpen(false);
    // Optionnel : rediriger vers la home de la langue choisie
    // navigate(getLocalizedPath("home"));
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
    {
      name: t("nav.legal") || "Mentions Légales",
      path: getLocalizedPath("legal"),
      id: "legal",
    },
    {
      name: t("nav.terms_gv") || "CGV",
      path: getLocalizedPath("tos"),
      id: "tos",
    },
    {
      name: t("nav.terms_gu") || "CGU",
      path: getLocalizedPath("gcu"),
      id: "gcu",
    },
  ];

  return (
    <>
      <nav
        className={`fixed top-0 w-full z-[70] transition-all duration-300 ${isScrolled || mobileMenuOpen ? "bg-black shadow-xl" : "bg-black/80 backdrop-blur-sm"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Section */}
            <Link
              to={getLocalizedPath("home")}
              className="z-[80] flex items-center space-x-3 group rtl:space-x-reverse"
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
                <span className="text-2xl font-black text-white leading-none uppercase tracking-tighter">
                  marsAI
                </span>
                <span className="text-[10px] text-cyan-400 font-mono tracking-widest uppercase">
                  Festival 2026
                </span>
              </div>
            </Link>

            {/* Desktop Navigation Links */}
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

              {/* Dropdown "Plus" Desktop */}
              <div className="relative ml-2">
                <button
                  onClick={() =>
                    setActiveDropdown(activeDropdown === "more" ? null : "more")
                  }
                  className="px-3 py-2 text-sm font-medium text-gray-300 flex items-center gap-1 hover:text-white transition-colors"
                >
                  <span>{t("nav.more") || "Plus"}</span>
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
                    className={`absolute ${i18n.language === "ar" ? "left-0" : "right-0"} mt-2 w-56 bg-gray-900 border border-gray-800 rounded-xl shadow-2xl overflow-hidden`}
                  >
                    {moreNav.map((item) => (
                      <Link
                        key={item.id}
                        to={item.path}
                        onClick={() => setActiveDropdown(null)}
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-gray-800 hover:text-cyan-400 transition-colors"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Side: Lang Switcher & CTA Desktop */}
            <div className="flex items-center space-x-4 rtl:space-x-reverse z-[80]">
              {/* Language Switcher DESKTOP */}
              <div className="hidden lg:flex items-center border-x border-gray-800 px-4 space-x-3 rtl:space-x-reverse">
                {["fr", "en", "ar"].map((lang) => (
                  <button
                    key={lang}
                    onClick={() => handleLanguageChange(lang)}
                    className={`text-[11px] font-bold uppercase transition-colors hover:text-cyan-400 ${i18n.language === lang ? "text-cyan-400" : "text-gray-500"}`}
                  >
                    {lang}
                  </button>
                ))}
              </div>

              <Link
                to={getLocalizedPath("submit")}
                className="hidden md:block px-5 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-full hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all"
              >
                {t("nav.submitFilm")}
              </Link>

              {/* Burger Button Mobile */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="lg:hidden p-2 text-gray-400 hover:text-white transition-colors"
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
        </div>
      </nav>

      {/* Mobile Menu (Overlay) - Inchangé mais vérifie bien le bouton de langue dedans */}
      <div
        className={`fixed inset-0 z-[60] bg-black transform transition-transform duration-500 ease-in-out ${mobileMenuOpen ? "translate-y-0" : "-translate-y-full"} lg:hidden`}
      >
        <div className="flex flex-col h-full pt-28 pb-10 px-8 overflow-y-auto">
          <div className="flex flex-col space-y-5">
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
            <div className="h-px bg-gray-800 my-4" />
            <div className="grid grid-cols-1 gap-4">
              {moreNav.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-gray-400 text-lg hover:text-white"
                >
                  {item.name}
                </Link>
              ))}
            </div>
          </div>
          <div className="mt-auto pt-10 flex flex-col gap-6">
            <Link
              to={getLocalizedPath("submit")}
              onClick={() => setMobileMenuOpen(false)}
              className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-center font-bold rounded-xl shadow-lg"
            >
              {t("nav.submitFilm")}
            </Link>
            <div className="flex justify-center gap-10">
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
