import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getCurrentSessionUser, getSitePhaseState } from "../api";
import { useTheme } from "../context/ThemeContext";

function normalizePath(path = "") {
  const value = String(path || "").trim();
  if (!value) return "/";
  if (!value.startsWith("/")) return `/${value}`;
  return value;
}

function normalizeLabel(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

export default function Navbar() {
  const { t, i18n } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const { isLight, toggleTheme } = useTheme();

  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [utilityMenuOpen, setUtilityMenuOpen] = useState(false);
  const [hideGalleryForVisitors, setHideGalleryForVisitors] = useState(false);
  const [hideSubmitForVisitors, setHideSubmitForVisitors] = useState(false);
  const [hideCallForProjects, setHideCallForProjects] = useState(false);
  const [hasSession, setHasSession] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 16);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setUtilityMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const [sitePhase, sessionPayload] = await Promise.all([
          getSitePhaseState(),
          getCurrentSessionUser().catch(() => null),
        ]);
        if (cancelled) return;

        const phaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
        const role = String(sessionPayload?.user?.role || "").toLowerCase();
        const hasAdminSession = role === "admin" || role === "superadmin";

        setHasSession(Boolean(sessionPayload?.authenticated) || Boolean(sessionPayload?.user));
        setHideCallForProjects(phaseKey === "phase_2" || phaseKey === "phase_3");
        setHideGalleryForVisitors(phaseKey === "phase_1" && !hasAdminSession);
        setHideSubmitForVisitors(
          (phaseKey === "phase_2" || phaseKey === "phase_3") && !hasAdminSession,
        );
      } catch {
        if (cancelled) return;
        setHideCallForProjects(false);
        setHideGalleryForVisitors(false);
        setHideSubmitForVisitors(false);
        setHasSession(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  const routeAliases = {
    "/accueil": "/home",
    "/home": "/accueil",
    "/a-propos": "/about",
    "/about": "/a-propos",
    "/films": "/movies",
    "/movies": "/films",
    "/agenda": "/schedule",
    "/schedule": "/agenda",
    "/jury": "/jury-eng",
    "/jury-eng": "/jury",
    "/partenaires": "/partners",
    "/partners": "/partenaires",
    "/appel-a-projet": "/call-for-project",
    "/call-for-project": "/appel-a-projet",
    "/call-for-projects": "/appel-a-projet",
    "/deposer-un-film": "/submit-film",
    "/submit-film": "/deposer-un-film",
    "/submit-a-film": "/deposer-un-film",
    "/cgv": "/tos",
    "/tos": "/cgv",
    "/cgu": "/gcu",
    "/gcu": "/cgu",
    "/mentions-legales": "/legal-notice",
    "/legal-notice": "/mentions-legales",
  };

  const isActive = (path) => {
    const safePath = normalizePath(path);
    const currentPath = normalizePath(location.pathname);
    return currentPath === safePath || normalizePath(routeAliases[currentPath]) === safePath;
  };

  const handleLanguageChange = (nextLanguage) => {
    if (nextLanguage === i18n.language) return;

    const pathMappings = {
      fr: {
        "/home": "/accueil",
        "/about": "/a-propos",
        "/movies": "/films",
        "/schedule": "/agenda",
        "/jury-eng": "/jury",
        "/partners": "/partenaires",
        "/call-for-project": "/appel-a-projet",
        "/call-for-projects": "/appel-a-projet",
        "/deposer-un-film": "/deposer-un-film",
        "/submit-film": "/deposer-un-film",
        "/submit-a-film": "/deposer-un-film",
        "/tos": "/cgv",
        "/gcu": "/cgu",
        "/legal-notice": "/mentions-legales",
      },
      en: {
        "/accueil": "/home",
        "/a-propos": "/about",
        "/films": "/movies",
        "/agenda": "/schedule",
        "/jury": "/jury-eng",
        "/partenaires": "/partners",
        "/appel-a-projet": "/call-for-project",
        "/deposer-un-film": "/submit-film",
        "/submit-a-film": "/submit-film",
        "/cgv": "/tos",
        "/cgu": "/gcu",
        "/mentions-legales": "/legal-notice",
      },
    };

    const currentPath = normalizePath(location.pathname);
    const nextPath = pathMappings[nextLanguage]?.[currentPath] || currentPath;

    i18n.changeLanguage(nextLanguage);
    if (nextPath !== currentPath) {
      navigate(nextPath, { replace: true });
    }
  };

  const homePath = i18n.language === "en" ? "/home" : "/accueil";
  const submitFilmPath = i18n.language === "en" ? "/submit-film" : "/deposer-un-film";
  const profileLabel = i18n.language === "en" ? "Profile" : "Profil";
  const themeToggleLabel = i18n.language === "en"
    ? (isLight ? "Night mode" : "Day mode")
    : (isLight ? "Mode nuit" : "Mode jour");

  const mainNav = useMemo(
    () => [
      { id: "home", name: normalizeLabel(t("nav.home")), path: homePath },
      {
        id: "about",
        name: normalizeLabel(t("nav.about")),
        path: i18n.language === "en" ? "/about" : "/a-propos",
      },
      {
        id: "films",
        name: normalizeLabel(t("nav.films")),
        path: i18n.language === "en" ? "/movies" : "/films",
      },
      {
        id: "agenda",
        name: normalizeLabel(t("nav.agenda")),
        path: i18n.language === "en" ? "/schedule" : "/agenda",
      },
      {
        id: "call",
        name: normalizeLabel(t("nav.callForProjects")),
        path: i18n.language === "en" ? "/call-for-project" : "/appel-a-projet",
      },
      {
        id: "jury",
        name: normalizeLabel(t("nav.jury")),
        path: i18n.language === "en" ? "/jury-eng" : "/jury",
      },
      {
        id: "partners",
        name: normalizeLabel(t("nav.partners")),
        path: i18n.language === "en" ? "/partners" : "/partenaires",
      },
    ],
    [t, homePath, i18n.language],
  );

  const utilityNav = useMemo(
    () => [
      { id: "terms_gv", name: normalizeLabel(t("nav.terms_gv")), path: i18n.language === "en" ? "/tos" : "/cgv" },
      { id: "terms_gu", name: normalizeLabel(t("nav.terms_gu")), path: i18n.language === "en" ? "/gcu" : "/cgu" },
      {
        id: "legal",
        name: normalizeLabel(t("nav.legal")),
        path: i18n.language === "en" ? "/legal-notice" : "/mentions-legales",
      },
      { id: "contact", name: normalizeLabel(t("nav.contact")), path: "/contact" },
      { id: "newsletter", name: normalizeLabel(t("footer.newsletter")), path: "/newsletter" },
    ],
    [t, i18n.language],
  );

  const visibleMainNav = mainNav.filter((item) => {
    if (hideGalleryForVisitors && item.id === "films") return false;
    if (hideCallForProjects && item.id === "call") return false;
    return true;
  });
  const mobileNavItems = useMemo(() => {
    const merged = [...visibleMainNav, ...utilityNav];
    const seen = new Set();
    return merged.filter((item) => {
      const key = `${item.path}::${item.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [visibleMainNav, utilityNav]);

  return (
    <header
      className={`sticky top-0 z-[80] border-b transition-all duration-300 ${
        isLight
          ? (isScrolled
            ? "border-cyan-300/60 bg-[linear-gradient(120deg,rgba(235,245,255,0.94),rgba(219,235,255,0.9))] shadow-[0_12px_32px_rgba(2,132,199,0.2)] backdrop-blur-xl"
            : "border-cyan-200/70 bg-[linear-gradient(120deg,rgba(244,250,255,0.9),rgba(230,242,255,0.86))] backdrop-blur-md")
          : (isScrolled
            ? "border-cyan-300/30 bg-slate-950/92 shadow-[0_12px_40px_rgba(2,6,23,0.55)] backdrop-blur-xl"
            : "border-slate-700/60 bg-slate-950/72 backdrop-blur-md")
      }`}
    >
      <div className="site-container">
        <div className="flex h-20 items-center justify-between gap-4">
          <Link to={homePath} className="inline-flex items-center gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-300 to-sky-500 text-slate-950 shadow-[0_10px_24px_rgba(14,165,233,0.45)]">
              <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
                <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm12.553 1.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
              </svg>
            </span>
            <span className="flex flex-col leading-none">
              <span className={`text-xl font-black uppercase tracking-tight ${isLight ? "text-slate-950" : "text-white"}`}>marsAI</span>
              <span className={`text-[10px] font-bold uppercase tracking-[0.2em] ${isLight ? "text-cyan-700/90" : "text-cyan-300/90"}`}>
                Festival 2026
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-1 xl:flex">
            {visibleMainNav.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black uppercase ${
                  item.id === "call" ? "tracking-[0.08em]" : "tracking-[0.12em]"
                } transition-colors ${
                  isActive(item.path)
                    ? (isLight ? "bg-cyan-100/80 text-cyan-800" : "bg-cyan-400/16 text-cyan-200")
                    : (isLight
                      ? "text-slate-700 hover:bg-cyan-50/80 hover:text-cyan-800"
                      : "text-slate-200/90 hover:bg-slate-800/70 hover:text-white")
                }`}
              >
                {item.name}
              </Link>
            ))}

            <div className="relative">
              <button
                type="button"
                onClick={() => setUtilityMenuOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                  isLight
                    ? "text-slate-700 hover:bg-cyan-50/80 hover:text-cyan-800"
                    : "text-slate-200/90 hover:bg-slate-800/70 hover:text-white"
                }`}
              >
                <span>{t("nav.more")}</span>
                <svg
                  className={`h-4 w-4 transition-transform ${utilityMenuOpen ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {utilityMenuOpen && (
                <div className={`absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl p-2 ${
                  isLight
                    ? "border border-cyan-200/80 bg-[linear-gradient(145deg,rgba(248,252,255,0.96),rgba(226,240,255,0.92))] shadow-[0_18px_44px_rgba(2,132,199,0.16)]"
                    : "border border-slate-600/70 bg-slate-900/95 shadow-[0_18px_44px_rgba(2,6,23,0.7)]"
                }`}>
                  {utilityNav.map((item) => (
                    <Link
                      key={item.id}
                      to={item.path}
                      className={`block rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
                        isLight
                          ? "text-slate-700 hover:bg-cyan-50/80 hover:text-cyan-800"
                          : "text-slate-200 hover:bg-cyan-400/10 hover:text-cyan-200"
                      }`}
                    >
                      {item.name}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <div className={`mr-1 inline-flex items-center rounded-full border p-1 ${
              isLight
                ? "border-cyan-200/80 bg-white/70"
                : "border-slate-600/80 bg-slate-900/70"
            }`}>
              <button
                type="button"
                onClick={() => handleLanguageChange("fr")}
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                  i18n.language === "fr"
                    ? (isLight ? "bg-cyan-100/80 text-cyan-800" : "bg-cyan-400/18 text-cyan-200")
                    : (isLight ? "text-slate-600 hover:text-cyan-800" : "text-slate-300 hover:text-white")
                }`}
              >
                FR
              </button>
              <button
                type="button"
                onClick={() => handleLanguageChange("en")}
                className={`rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-[0.12em] ${
                  i18n.language === "en"
                    ? (isLight ? "bg-cyan-100/80 text-cyan-800" : "bg-cyan-400/18 text-cyan-200")
                    : (isLight ? "text-slate-600 hover:text-cyan-800" : "text-slate-300 hover:text-white")
                }`}
              >
                EN
              </button>
            </div>

            {hasSession && (
              <Link
                to="/dashboard"
                title={profileLabel}
                aria-label={profileLabel}
                className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                  isLight
                    ? "border-cyan-200/80 bg-white/80 text-cyan-700 hover:border-cyan-400 hover:text-cyan-800"
                    : "border-slate-500/80 bg-slate-900/80 text-cyan-200 hover:border-cyan-300/70 hover:text-white"
                }`}
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.94 17.94 0 0112 21.75a17.94 17.94 0 01-7.5-1.632z"
                  />
                </svg>
              </Link>
            )}

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={themeToggleLabel}
              title={themeToggleLabel}
              className={`order-last ml-4 inline-flex h-10 w-10 items-center justify-center rounded-xl border transition ${
                isLight
                  ? "border-cyan-200/80 bg-white/80 text-amber-500 hover:border-cyan-400 hover:text-amber-600"
                  : "border-slate-500/80 bg-slate-900/80 text-cyan-200 hover:border-cyan-300/70 hover:text-white"
              }`}
            >
              {isLight ? (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                </svg>
              ) : (
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <circle cx="12" cy="12" r="4" strokeWidth={2} />
                  <path strokeLinecap="round" strokeWidth={2} d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.071 7.071-1.414-1.414M6.343 6.343 4.93 4.929m14.142 0-1.414 1.414M6.343 17.657l-1.414 1.414" />
                </svg>
              )}
            </button>

            {!hideSubmitForVisitors && (
              <Link
                to={submitFilmPath}
                className="site-btn-primary inline-flex min-h-[44px] items-center justify-center text-center leading-none"
              >
                {t("nav.submitFilm")}
              </Link>
            )}
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition-colors xl:hidden ${
              isLight
                ? "border-cyan-200/80 bg-white/80 text-slate-700 hover:border-cyan-400 hover:text-cyan-700"
                : "border-slate-600/70 bg-slate-900/80 text-slate-100 hover:border-cyan-300/70 hover:text-cyan-200"
            }`}
            aria-expanded={mobileMenuOpen}
            aria-label="Toggle menu"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              {mobileMenuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
          <div
          className={`absolute inset-x-0 top-full z-[90] border-t px-4 py-4 xl:hidden max-h-[calc(100vh-5rem)] overflow-y-auto overscroll-contain ${
            isLight
              ? "border-cyan-200/80 bg-[linear-gradient(160deg,rgba(244,250,255,0.96),rgba(226,240,255,0.94))]"
              : "border-slate-700/60 bg-slate-950/96"
          }`}
        >
          <div className="site-container px-0 pb-6">
            <div className="space-y-1">
              {mobileNavItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`block rounded-xl px-3 py-3 text-sm font-bold uppercase tracking-[0.12em] ${
                    isActive(item.path)
                      ? (isLight ? "bg-cyan-100/80 text-cyan-800" : "bg-cyan-400/16 text-cyan-200")
                      : (isLight ? "text-slate-700 hover:bg-cyan-50/80" : "text-slate-100/90 hover:bg-slate-800/80")
                  }`}
                >
                  {item.name}
                </Link>
              ))}
            </div>

            {!hideSubmitForVisitors && (
              <Link
                to={submitFilmPath}
                className="site-btn-primary mt-4 inline-flex min-h-[44px] w-full items-center justify-center px-4 py-3 text-center text-[11px] leading-none"
              >
                {t("nav.submitFilm")}
              </Link>
            )}

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLanguageChange("fr")}
                    className={`rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                    i18n.language === "fr"
                      ? (isLight
                        ? "border-cyan-300 bg-cyan-100/80 text-cyan-800"
                        : "border-cyan-400/40 bg-cyan-400/16 text-cyan-200")
                      : (isLight ? "border-cyan-200/80 text-slate-600" : "border-slate-600/70 text-slate-300")
                  }`}
                >
                  FR
                </button>
                <button
                  type="button"
                  onClick={() => handleLanguageChange("en")}
                  className={`rounded-lg border px-3 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                    i18n.language === "en"
                      ? (isLight
                        ? "border-cyan-300 bg-cyan-100/80 text-cyan-800"
                        : "border-cyan-400/40 bg-cyan-400/16 text-cyan-200")
                      : (isLight ? "border-cyan-200/80 text-slate-600" : "border-slate-600/70 text-slate-300")
                  }`}
                >
                  EN
                </button>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-2">
                {hasSession && (
                  <Link
                    to="/dashboard"
                    title={profileLabel}
                    aria-label={profileLabel}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                      isLight
                        ? "border-cyan-300 bg-white/80 text-cyan-700"
                        : "border-slate-600/70 bg-slate-900/80 text-cyan-200"
                    }`}
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.118a7.5 7.5 0 0115 0A17.94 17.94 0 0112 21.75a17.94 17.94 0 01-7.5-1.632z"
                      />
                    </svg>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={themeToggleLabel}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border ${
                    isLight
                      ? "border-cyan-300 bg-white/80 text-amber-500 hover:border-cyan-400 hover:text-amber-600"
                      : "border-slate-600/70 bg-slate-900/80 text-cyan-200 hover:border-cyan-300/70 hover:text-white"
                  }`}
                >
                  {isLight ? (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12.79A9 9 0 1111.21 3a7 7 0 009.79 9.79z" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <circle cx="12" cy="12" r="4" strokeWidth={2} />
                      <path strokeLinecap="round" strokeWidth={2} d="M12 2v2m0 16v2m10-10h-2M4 12H2m17.071 7.071-1.414-1.414M6.343 6.343 4.93 4.929m14.142 0-1.414 1.414M6.343 17.657l-1.414 1.414" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
