import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCurrentSessionUser, getSitePhaseState } from "../api";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  // Détermine la langue actuelle : priorité à l'URL, sinon i18n, sinon "fr"
  const currentLang = lang || i18n.language || "fr";

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [hideGalleryForVisitors, setHideGalleryForVisitors] = useState(false);
  const [hideSubmitForVisitors, setHideSubmitForVisitors] = useState(false);

  // LOGIQUE D'URL : Pas de préfixe pour le français
  const getLangPath = (path) => {
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    if (currentLang === "fr") {
      return `/${cleanPath}`;
    }
    return `/${currentLang}/${cleanPath}`;
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  // Gestion des phases et permissions
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const sitePhase = await getSitePhaseState();
        if (cancelled) return;
        const phaseKey = String(
          sitePhase?.currentPhase || "phase_1",
        ).toLowerCase();
        const needsSessionCheck = ["phase_1", "phase_2", "phase_3"].includes(
          phaseKey,
        );

        if (!needsSessionCheck) {
          setHideGalleryForVisitors(false);
          setHideSubmitForVisitors(false);
          return;
        }

        let hasAdminSession = false;
        try {
          const sessionPayload = await getCurrentSessionUser();
          const role = String(sessionPayload?.user?.role || "").toLowerCase();
          hasAdminSession = role === "admin" || role === "superadmin";
        } catch {
          hasAdminSession = false;
        }

        if (!cancelled) {
          setHideGalleryForVisitors(phaseKey === "phase_1" && !hasAdminSession);
          setHideSubmitForVisitors(
            ["phase_2", "phase_3"].includes(phaseKey) && !hasAdminSession,
          );
        }
      } catch {
        setHideGalleryForVisitors(false);
        setHideSubmitForVisitors(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Redirection lors du changement de langue
  const handleLanguageChange = (nextLanguage) => {
    i18n.changeLanguage(nextLanguage);
    if (nextLanguage === "fr") {
      navigate("/");
    } else {
      navigate(`/${nextLanguage}/`);
    }
  };

  const toggleDropdown = (name) =>
    setActiveDropdown(activeDropdown === name ? null : name);

  const mainNav = [
    {
      name: t("nav.home"),
      path: currentLang === "en" ? "home" : "accueil",
      id: "home",
    },
    {
      name: t("nav.about"),
      path: currentLang === "en" ? "about" : "a-propos",
      id: "about",
    },
    {
      name: t("nav.films"),
      path: currentLang === "en" ? "movies" : "films",
      id: "films",
    },
    {
      name: t("nav.agenda"),
      path: currentLang === "en" ? "schedule" : "agenda",
      id: "agenda",
    },
    {
      name: t("nav.callForProjects"),
      path: currentLang === "en" ? "call-for-project" : "appel-a-projet",
      id: "call",
    },
    {
      name: t("nav.jury"),
      path: "jury",
      id: "jury",
    },
    {
      name: t("nav.partners"),
      path: currentLang === "en" ? "partners" : "partenaires",
      id: "partners",
    },
  ];

  const visibleMainNav = hideGalleryForVisitors
    ? mainNav.filter((item) => item.id !== "films")
    : mainNav;

  const moreNav = [
    {
      name: t("nav.terms_gv"),
      path: currentLang === "en" ? "tos" : "cgv",
      id: "terms_gv",
    },
    {
      name: t("nav.terms_gu"),
      path: currentLang === "en" ? "gcu" : "cgu",
      id: "terms_gu",
    },
    {
      name: t("nav.legal"),
      path: currentLang === "en" ? "legal-notice" : "mentions-legales",
      id: "legal",
    },
    { name: t("nav.contact"), path: "contact", id: "contact" },
  ];

  const submitFilmPath = getLangPath(
    currentLang === "en" ? "submit-film" : "deposer-un-film",
  );

  return (
    <>
      <nav
        className={`relative z-[70] w-full transition-all duration-300 ${isScrolled ? "bg-black/95 backdrop-blur-lg shadow-lg shadow-cyan-500/10" : "bg-black/80 backdrop-blur-sm"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            {/* Logo Link : Racine pour FR, préfixe pour les autres */}
            <Link
              to={currentLang === "fr" ? "/" : `/${currentLang}/`}
              className="flex items-center space-x-3 group"
            >
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

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center space-x-1">
              {visibleMainNav.map((item) => {
                const fullPath = getLangPath(item.path);
                return (
                  <Link
                    key={item.id}
                    to={fullPath}
                    className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${location.pathname === fullPath ? "text-cyan-400 bg-white/5" : "text-gray-300 hover:text-white"}`}
                  >
                    {item.name}
                  </Link>
                );
              })}

              {/* Menu More */}
              <div className="relative">
                <button
                  onClick={() => toggleDropdown("more")}
                  className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white rounded-lg flex items-center space-x-1"
                >
                  <span>{t("nav.more")}</span>
                  <svg
                    className={`w-4 h-4 transition-transform ${activeDropdown === "more" ? "rotate-180" : ""}`}
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
                        to={getLangPath(item.path)}
                        className="block px-4 py-3 text-sm text-gray-300 hover:bg-cyan-400/10 hover:text-cyan-400 transition-colors"
                      >
                        {item.name}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Language Switcher */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="flex items-center border-r border-gray-800 pr-4 space-x-2 text-[10px] font-bold">
                <button
                  onClick={() => handleLanguageChange("fr")}
                  className={`hover:text-cyan-400 ${currentLang === "fr" ? "text-cyan-400" : "text-gray-500"}`}
                >
                  FR
                </button>
                <span className="text-gray-700">|</span>
                <button
                  onClick={() => handleLanguageChange("en")}
                  className={`hover:text-cyan-400 ${currentLang === "en" ? "text-cyan-400" : "text-gray-500"}`}
                >
                  EN
                </button>
                <span className="text-gray-700">|</span>
                <button
                  onClick={() => handleLanguageChange("ar")}
                  className={`hover:text-cyan-400 ${currentLang === "ar" ? "text-cyan-400" : "text-gray-500"}`}
                >
                  AR
                </button>
              </div>

              {!hideSubmitForVisitors && (
                <Link
                  to={submitFilmPath}
                  className="group relative px-6 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-sm rounded-full overflow-hidden transition-all duration-300 hover:scale-105"
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
                    <span>{t("nav.submitFilm")}</span>
                  </span>
                </Link>
              )}
            </div>

            {/* Mobile Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-gray-300"
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
      </nav>

      {/* Menu Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          ></div>
          <div className="fixed top-20 left-0 right-0 bottom-0 bg-black/95 backdrop-blur-lg overflow-y-auto">
            <div className="px-4 py-6 space-y-1">
              <div className="flex space-x-4 px-4 mb-4">
                {["fr", "en", "ar"].map((l) => (
                  <button
                    key={l}
                    onClick={() => handleLanguageChange(l)}
                    className={`text-sm uppercase ${currentLang === l ? "text-cyan-400" : "text-gray-500"}`}
                  >
                    {l === "fr"
                      ? "Français"
                      : l === "en"
                        ? "English"
                        : "العربية"}
                  </button>
                ))}
              </div>
              {visibleMainNav.map((item) => {
                const fullPath = getLangPath(item.path);
                return (
                  <Link
                    key={item.id}
                    to={fullPath}
                    className={`block px-4 py-3 text-base font-medium rounded-lg ${location.pathname === fullPath ? "bg-cyan-400/10 text-cyan-400" : "text-gray-300"}`}
                  >
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&display=swap');
        .animate-fadeIn { animation: fadeIn 0.2s ease-out forwards; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>
    </>
  );
};

export default Navbar;
