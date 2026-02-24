import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCurrentSessionUser, getSitePhaseState } from "../api";

const Navbar = () => {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  // 1. Détection de la langue (FR, EN, ou AR)
  const pathParts = location.pathname.split("/").filter(Boolean);
  const currentLang = ["en", "ar"].includes(pathParts[0]) ? pathParts[0] : "fr";

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [hideGalleryForVisitors, setHideGalleryForVisitors] = useState(false);
  const [hideSubmitForVisitors, setHideSubmitForVisitors] = useState(false);

  // 2. Synchronisation de la langue et de la direction du texte
  useEffect(() => {
    if (i18n.language !== currentLang) {
      i18n.changeLanguage(currentLang);
    }
    // AR = Droite à Gauche (RTL) | FR/EN = Gauche à Droite (LTR)
    document.documentElement.dir = currentLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = currentLang;
  }, [currentLang, i18n]);

  // 3. Générateur d'URL intelligent
  const getLangPath = (path) => {
    if (!path || path === "" || path === "/") {
      return currentLang === "fr" ? "/" : `/${currentLang}`;
    }
    const cleanPath = path.startsWith("/") ? path.substring(1) : path;
    return currentLang === "fr"
      ? `/${cleanPath}`
      : `/${currentLang}/${cleanPath}`;
  };

  // 4. Gestionnaire de changement de langue (Switch)
  const handleLanguageChange = (nextLanguage) => {
    let cleanPath = location.pathname;
    // On retire le préfixe actuel (/en ou /ar) s'il existe
    if (cleanPath.startsWith("/en") || cleanPath.startsWith("/ar")) {
      cleanPath = cleanPath.substring(3) || "/";
    }

    const isAtHome = cleanPath === "" || cleanPath === "/";

    let newTarget;
    if (nextLanguage === "fr") {
      newTarget = isAtHome ? "/" : cleanPath;
    } else {
      newTarget = isAtHome
        ? `/${nextLanguage}`
        : `/${nextLanguage}${cleanPath.startsWith("/") ? cleanPath : "/" + cleanPath}`;
    }

    navigate(newTarget);
    setMobileMenuOpen(false);
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // 5. Configuration dynamique du Menu (Gère FR, EN, AR)
  const getSlug = (id) => {
    const slugs = {
      about: { fr: "a-propos", en: "about", ar: "about" },
      films: { fr: "films", en: "movies", ar: "movies" },
      agenda: { fr: "agenda", en: "schedule", ar: "schedule" },
      call: {
        fr: "appel-a-projet",
        en: "call-for-project",
        ar: "call-for-project",
      },
      partners: { fr: "partenaires", en: "partners", ar: "partners" },
      jury: { fr: "jury", en: "jury", ar: "jury" },
    };
    return slugs[id][currentLang] || slugs[id]["fr"];
  };

  const mainNav = [
    { name: t("nav.home"), path: "", id: "home" },
    { name: t("nav.about"), path: getSlug("about"), id: "about" },
    { name: t("nav.films"), path: getSlug("films"), id: "films" },
    { name: t("nav.agenda"), path: getSlug("agenda"), id: "agenda" },
    { name: t("nav.callForProjects"), path: getSlug("call"), id: "call" },
    { name: t("nav.jury"), path: getSlug("jury"), id: "jury" },
    { name: t("nav.partners"), path: getSlug("partners"), id: "partners" },
  ];

  const visibleMainNav = hideGalleryForVisitors
    ? mainNav.filter((i) => i.id !== "films")
    : mainNav;

  return (
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-[100] w-full transition-all duration-300 ${isScrolled ? "bg-black/95 shadow-lg" : "bg-black/80"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* LOGO */}
          <Link
            to={getLangPath("")}
            className="flex items-center space-x-3 group"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-pink-500 flex items-center justify-center transform group-hover:scale-110 transition-transform">
              <svg
                className="w-6 h-6 text-black"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </div>
            <span
              className="text-2xl font-black text-white uppercase tracking-tight"
              style={{ fontFamily: "'Bebas Neue', sans-serif" }}
            >
              marsAI
            </span>
          </Link>

          {/* DESKTOP NAV */}
          <div className="hidden lg:flex items-center space-x-1">
            {visibleMainNav.map((item) => (
              <Link
                key={item.id}
                to={getLangPath(item.path)}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-cyan-400 transition-all"
              >
                {item.name}
              </Link>
            ))}
          </div>

          {/* SÉLECTEUR DE LANGUES (FR | EN | AR) */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="flex items-center bg-white/5 border border-white/10 px-3 py-1.5 rounded-full space-x-3 text-[11px] font-bold">
              {["fr", "en", "ar"].map((l) => (
                <button
                  key={l}
                  onClick={() => handleLanguageChange(l)}
                  className={`uppercase transition-colors ${currentLang === l ? "text-cyan-400" : "text-gray-500 hover:text-white"}`}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </nav>
      <div className="h-20" />
    </>
  );
};

export default Navbar;
