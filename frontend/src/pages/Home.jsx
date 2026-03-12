import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HomeModelViewer from "../components/HomeModelViewer";
import Seo from "../components/Seo";
import { OrganizationSchema, EventSchema, WebSiteSchema } from "../components/Schema";
import { useTranslation } from "react-i18next";
import { getRecentAgendaEvents, getSitePhaseState } from "../api";
import PhaseCountdownBanner from "../components/phases/PhaseCountdownBanner";
import { useTheme } from "../context/ThemeContext";
import { getLocalizedPath, normalizeLanguage } from "../utils/localizedRoutes";

export default function Home({ page }) {
  const { i18n, t } = useTranslation();
  const { isLight } = useTheme();
  const [sitePhase, setSitePhase] = useState(null);
  const [phaseLoaded, setPhaseLoaded] = useState(false);
  const [latestAgendaEvents, setLatestAgendaEvents] = useState([]);
  const modelSrc =
    import.meta.env.VITE_HOME_MODEL_URL ||
    `${import.meta.env.BASE_URL}models/walking_robot_mr.glb`;
  const modelPoster = import.meta.env.VITE_HOME_MODEL_POSTER_URL || "";
  const modelFallbackSrc = isLight
    ? "/images/robot_light.png"
    : "/images/robot_night.png";
  const currentLanguage = normalizeLanguage(i18n.language);
  const isArabic = currentLanguage === "ar";
  const submitFilmPath = getLocalizedPath("submitFilm", i18n.language);
  const participateVideoUrl =
    import.meta.env.VITE_HOME_PARTICIPATE_VIDEO_URL
    || "https://cdn.pixabay.com/video/2023/07/28/173530-849610807_large.mp4";
  const agendaPath = getLocalizedPath("agenda", i18n.language);
  const callForProjectsPath = getLocalizedPath("call", i18n.language);
  const partnersPath = getLocalizedPath("partners", i18n.language);
  const aboutPath = getLocalizedPath("about", i18n.language);
  const moviesPath = getLocalizedPath("films", i18n.language);
  const currentPhaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
  const isCallForProjectsVisible = currentPhaseKey === "phase_1";
  const isCallForProjectsPhase = currentPhaseKey === "phase_1";
  const heroCtaPath = isCallForProjectsPhase ? submitFilmPath : moviesPath;
  const heroCtaBadge = isCallForProjectsPhase
    ? t("home.hero_cta.call_badge")
    : t("home.hero_cta.selection_badge");
  const heroCtaTitle = isCallForProjectsPhase
    ? t("home.hero_cta.call_title")
    : t("home.hero_cta.selection_title");
  const heroCtaSubtitle = isCallForProjectsPhase
    ? t("home.hero_cta.call_subtitle")
    : t("home.hero_cta.selection_subtitle");
  const heroCtaAria = isCallForProjectsPhase
    ? t("home.hero_cta.call_aria")
    : t("home.hero_cta.selection_aria");
  const isCallForProjectsHref = (href) => {
    const normalized = String(href || "").toLowerCase();
    return normalized.includes("/appel-a-projet") || normalized.includes("/call-for-project");
  };

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await getSitePhaseState();
        if (!cancelled) setSitePhase(payload);
      } catch {
        if (!cancelled) setSitePhase(null);
      } finally {
        if (!cancelled) setPhaseLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const items = await getRecentAgendaEvents({
          lang: i18n.language,
          limit: 5,
        });
        if (!cancelled) {
          setLatestAgendaEvents(Array.isArray(items) ? items : []);
        }
      } catch {
        if (!cancelled) setLatestAgendaEvents([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  const parsed = useMemo(() => {
    const html = page?.content?.rendered || "";

    if (typeof window === "undefined") {
      return {
        title: page?.title?.rendered || "",
        heroLead: "",
        heroLinks: [],
        aboutTitle: "",
        aboutText: "",
        articles: [],
      };
    }

    const doc = new DOMParser().parseFromString(html, "text/html");

    // --- 1. HERO ---
    const heroLead = doc.querySelector("p")?.textContent?.trim() || "";
    const normalizeText = (value) =>
      String(value || "")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .trim();
    const linkOverrides = {
      "participer au festival": submitFilmPath,
      "voir le programme": agendaPath,
      "deposer un film": submitFilmPath,
      "take part in the festival": submitFilmPath,
      "see the program": agendaPath,
      "submit a film": submitFilmPath,
      "see the call for projects": callForProjectsPath,
      "voir l'appel a projet": callForProjectsPath,
      "voir l'appel a projets": callForProjectsPath,
    };
    const normalizeHrefToPath = (href) => {
      const raw = String(href || "").trim();
      if (!raw) return "";
      if (raw === "#participer") return submitFilmPath;
      if (raw === "#programme") return agendaPath;

      let pathname = raw;
      try {
        pathname = new URL(raw, window.location.origin).pathname || raw;
      } catch {
        pathname = raw;
      }

      let path = pathname.replace(/\/+$/, "");
      if (!path) path = "/";
      path = path
        .replace(/^\/MarsAi\/en\//i, "/")
        .replace(/^\/MarsAi\/fr\//i, "/")
        .replace(/^\/MarsAi\//i, "/");

      const mappedPaths = {
        "/submit-film": submitFilmPath,
        "/deposer-un-film": submitFilmPath,
        "/concours": submitFilmPath,
        "/ar/submit-film": submitFilmPath,
        "/agenda": agendaPath,
        "/schedule": agendaPath,
        "/ar/schedule": agendaPath,
        "/appel-a-projet": callForProjectsPath,
        "/appel-a-projets": callForProjectsPath,
        "/call-for-project": callForProjectsPath,
        "/call-for-projects": callForProjectsPath,
        "/ar/call-for-project": callForProjectsPath,
        "/partenaires": partnersPath,
        "/partners": partnersPath,
        "/ar/partners": partnersPath,
        "/a-propos": aboutPath,
        "/about": aboutPath,
        "/ar/about": aboutPath,
        "/films": moviesPath,
        "/movies": moviesPath,
        "/ar/movies": moviesPath,
      };

      return mappedPaths[path] || (path.startsWith("/") ? path : raw);
    };
    const rawHeroLinks = Array.from(doc.querySelectorAll("p:first-of-type a")).map(
      (a) => ({ href: a.href || "", text: a.textContent?.trim() || "" })
    );
    const heroLinks = rawHeroLinks.map((link) => {
      const key = normalizeText(link.text);
      const overrideByText = linkOverrides[key];
      const overrideByHref = normalizeHrefToPath(link.href);
      return { ...link, href: overrideByText || overrideByHref || link.href };
    });

    // --- 2. ABOUT ---
    const firstH2 = doc.querySelector("h2");
    const aboutTitle = firstH2?.textContent?.trim() || "";
    let aboutText = "";
    if (firstH2) {
      let next = firstH2.nextElementSibling;
      while (next && next.tagName.toLowerCase() !== "p") next = next.nextElementSibling;
      aboutText = next?.textContent?.trim() || "";
    }

    // --- 3. NEWS - Extraire les articles depuis WordPress ---
    const articles = [];
    const h3Elements = doc.querySelectorAll("h3");

    h3Elements.forEach((h3) => {
      const title = h3.textContent?.trim() || "";

      // Prendre le paragraphe suivant comme excerpt
      let excerpt = "";
      let next = h3.nextElementSibling;
      while (next && next.tagName.toLowerCase() !== "p") {
        next = next.nextElementSibling;
      }
      if (next) {
        excerpt = next.textContent?.trim() || "";
      }

      if (title || excerpt) {
        articles.push({
          title,
          excerpt,
          link: "",
          linkText: ""
        });
      }
    });

    return {
      title: page?.title?.rendered || "",
      heroLead,
      heroLinks,
      aboutTitle,
      aboutText,
      articles,
    };
  }, [
    aboutPath,
    agendaPath,
    callForProjectsPath,
    moviesPath,
    page,
    partnersPath,
    submitFilmPath,
  ]);

  const seoTitle = page?.title?.rendered || parsed.title || "Accueil";
  const seoDescription =
    parsed.heroLead || page?.excerpt?.rendered || page?.content?.rendered || "";
  const theme = isLight
    ? {
      main: "bg-[#dbe9ff] text-slate-900",
      heroOverlay: "from-[#021639]/35 via-[#0a2f5f]/42 to-[#dbe9ff]/82",
      heroHalo: "bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.28),_transparent_52%)]",
      heroCard: "border-cyan-300/50 bg-[#f7fbff]/62 shadow-[0_24px_58px_rgba(2,132,199,0.2)]",
      heroBadge: "text-cyan-800/90",
      heroTitle: "text-slate-950",
      heroSubtitle: "text-slate-800/90",
      introSection: "bg-[#d8e9ff]",
      introCard: "border-cyan-200/80 bg-[linear-gradient(150deg,rgba(248,252,255,0.94),rgba(230,242,255,0.9))] shadow-[0_20px_50px_rgba(2,23,55,0.16)]",
      introTitle: "text-slate-900",
      introLead: "text-slate-700",
      introLink: "bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 hover:brightness-105",
      aboutSection: "bg-[#d3e5ff]",
      aboutCard: "bg-[linear-gradient(155deg,rgba(248,252,255,0.95),rgba(226,240,255,0.92))] border-cyan-200/75 shadow-[0_20px_50px_rgba(2,23,55,0.16)]",
      aboutTitle: "text-slate-900",
      aboutText: "text-slate-700/95",
      aboutViewer: "bg-[#eaf4ff] border-cyan-200/75",
      aboutLab: "text-cyan-700",
      newsSection: "bg-[#d6e8ff]",
      newsTitle: "text-cyan-700",
      newsPoster: "bg-[linear-gradient(155deg,rgba(249,253,255,0.96),rgba(231,243,255,0.92))] border-cyan-200/75",
      newsArticleTitle: "text-slate-900 group-hover:text-cyan-700",
      newsExcerpt: "text-slate-700",
      newsLink: "text-cyan-700 hover:text-slate-900 border-cyan-500",
      focusColor: "#0284c7",
    }
    : {
      main: "bg-[#0f172a] text-white",
      heroOverlay: "from-[#020617]/55 via-[#020617]/65 to-[#020617]/90",
      heroHalo: "bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_48%)]",
      heroCard: "border-cyan-200/25 bg-slate-900/35 hover:border-cyan-200/60 hover:bg-slate-900/55",
      heroBadge: "text-cyan-200/90",
      heroTitle: "text-white",
      heroSubtitle: "text-slate-100/90",
      introSection: "bg-[#0f172a]",
      introCard: "border-cyan-300/20 bg-[#111b33]/80 shadow-xl",
      introTitle: "text-white",
      introLead: "text-[#cbd5e1]",
      introLink: "bg-[#38bdf8] text-[#0f172a] hover:bg-white",
      aboutSection: "bg-[#0f172a]",
      aboutCard: "bg-[#1e293b] border-[#334155] shadow-xl",
      aboutTitle: "text-white",
      aboutText: "text-[#e2e8f0]",
      aboutViewer: "bg-[#0f172a] border-[#334155]",
      aboutLab: "text-cyan-200/90",
      newsSection: "bg-[#0f172a]",
      newsTitle: "text-[#38bdf8]",
      newsPoster: "bg-[#1e293b] border-[#334155] shadow-lg",
      newsArticleTitle: "text-white group-hover:text-[#38bdf8]",
      newsExcerpt: "text-[#94a3b8]",
      newsLink: "text-[#38bdf8] hover:text-white border-[#38bdf8]",
      focusColor: "#38bdf8",
    };

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <OrganizationSchema />
      <EventSchema />
      <WebSiteSchema />
      <main
        className={`w-full overflow-hidden font-['Montserrat'] ${theme.main}`}
        dir={isArabic ? "rtl" : "ltr"}
      >

      {/* Texture Grain - opacite reduite pour ne pas gener la lecture */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay pointer-events-none z-[60]"></div>

      {/* --- PARTICIPER CTA (plein ecran) --- */}
      <section className="relative min-h-screen w-full overflow-hidden">
        <video
          className="absolute inset-0 h-full w-full object-cover"
          src={participateVideoUrl}
          autoPlay
          muted
          loop
          playsInline
          preload="metadata"
          aria-hidden="true"
        />
        <div className={`absolute inset-0 bg-gradient-to-b ${theme.heroOverlay}`} />
        <div className={`absolute inset-0 ${theme.heroHalo}`} />

        <Link
          to={heroCtaPath}
          aria-label={heroCtaAria}
          className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 text-center sm:px-6"
        >
          <div className={`group w-full max-w-3xl rounded-[2rem] border px-4 py-8 backdrop-blur-md transition-all duration-500 hover:scale-[1.02] sm:rounded-[2.5rem] sm:px-8 sm:py-10 md:px-14 md:py-14 ${theme.heroCard}`}>
            <p className={`mb-4 text-[11px] font-black uppercase tracking-[0.22em] sm:text-[11px] sm:tracking-[0.35em] ${theme.heroBadge}`}>
              {heroCtaBadge}
            </p>
            <h2 className={`text-4xl font-black uppercase tracking-tight sm:text-5xl md:text-7xl ${theme.heroTitle}`}>
              {heroCtaTitle}
            </h2>
            <p className={`mt-5 text-xs font-semibold uppercase tracking-[0.16em] sm:mt-6 sm:text-sm sm:tracking-[0.2em] md:text-base ${theme.heroSubtitle}`}>
              {heroCtaSubtitle}
            </p>
          </div>
        </Link>

        {/* Transition douce vers la section suivante */}
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 h-44 md:h-56 bg-gradient-to-b ${
            isLight
              ? "from-transparent via-[#cfe4ff]/76 to-[#d8e9ff]"
              : "from-transparent via-[#0b1428]/72 to-[#0f172a]"
          }`}
        />
        <div
          aria-hidden
          className={`pointer-events-none absolute -bottom-10 left-1/2 z-30 h-24 w-[140%] -translate-x-1/2 rounded-t-[100%] blur-[1px] ${
            isLight ? "bg-[#d8e9ff]/98" : "bg-[#0f172a]/98"
          }`}
        />
      </section>

      {/* --- INTRO + COMPTEUR --- */}
      <section className={`relative py-16 md:py-24 ${theme.introSection}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-10">
          <div className={`rounded-[2.5rem] border p-8 md:p-12 ${theme.introCard}`}>
            <h1
              className={`text-3xl md:text-6xl font-black uppercase tracking-tight leading-[0.95] ${theme.introTitle}`}
              dangerouslySetInnerHTML={{ __html: parsed.title }}
            />

            {parsed.heroLead && (
              <p className={`mt-6 text-base md:text-xl max-w-3xl font-medium leading-relaxed ${theme.introLead}`}>
                {parsed.heroLead}
              </p>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              {parsed.heroLinks
                .filter((l) => isCallForProjectsVisible || !isCallForProjectsHref(l.href))
                .map((l, i) =>
                l.href.startsWith("/") ? (
                  <Link
                    key={i}
                    to={l.href}
                    aria-label={t("home.hero_link_aria", { label: l.text })}
                    className={`w-full sm:w-auto px-8 py-4 rounded-full font-black uppercase tracking-widest text-[11px] transition-colors shadow-lg text-center ${theme.introLink}`}
                  >
                    {l.text}
                  </Link>
                ) : (
                  <a
                    key={i}
                    href={l.href}
                    aria-label={t("home.hero_link_aria", { label: l.text })}
                    className={`w-full sm:w-auto px-8 py-4 rounded-full font-black uppercase tracking-widest text-[11px] transition-colors shadow-lg text-center ${theme.introLink}`}
                  >
                    {l.text}
                  </a>
                ),
              )}
            </div>

            {phaseLoaded && currentPhaseKey !== "phase_3" && (
              <div className="mt-8">
                <PhaseCountdownBanner
                  sitePhase={sitePhase}
                  language={i18n.language}
                  variant="home"
                  isLight={isLight}
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- ABOUT (Plus clair pour la lecture prolongee) --- */}
      {(parsed.aboutTitle || parsed.aboutText) && (
        <section className={`relative py-24 md:py-40 ${theme.aboutSection}`}>
          <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10">
            <div className={`rounded-[3rem] border p-5 md:p-20 ${theme.aboutCard}`}>
              <div className="grid md:grid-cols-2 gap-16 items-center">
                <div>
                  <h2 className={`text-3xl md:text-5xl font-black uppercase tracking-tight mb-8 ${theme.aboutTitle}`}>
                    {parsed.aboutTitle}
                  </h2>
                  <p className={`text-lg leading-relaxed font-medium ${theme.aboutText}`}>
                    {parsed.aboutText}
                  </p>
                </div>
                <div className={`rounded-3xl border overflow-hidden shadow-inner p-6 md:p-8 ${theme.aboutViewer}`}>
                  <HomeModelViewer
                    src={modelSrc}
                    poster={modelPoster || undefined}
                    fallbackSrc={modelFallbackSrc}
                    alt="Objet 3D MarsAI"
                    className="h-64 w-full md:h-80 cursor-grab active:cursor-grabbing"
                  />
                  <p className={`mt-6 text-center text-xs font-black uppercase tracking-[0.25em] ${theme.aboutLab}`}>
                    MarsAI Lab
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- NEWS (Events agenda WordPress) --- */}
      {latestAgendaEvents.length > 0 && (
        <section className={`relative py-20 md:py-32 ${theme.newsSection}`}>
          <div className="max-w-4xl mx-auto px-4 sm:px-6 md:px-4">
            <h3 className={`text-2xl md:text-4xl font-black uppercase tracking-[0.4em] mb-24 text-center ${theme.newsTitle}`}>
              {t("home_news", "Actualites")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-12 justify-items-center">
              {latestAgendaEvents.map((event) => (
                <article key={event.id || event.title} className="group w-full max-w-[280px] flex flex-col">
                  <div className={`aspect-[3/4] rounded-[2.5rem] mb-8 overflow-hidden border ${theme.newsPoster}`}>
                    {event.image ? (
                      <img
                        src={event.image}
                        alt={t("home.event_poster_alt", { title: event.title })}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-t from-[#0f172a] to-transparent" />
                    )}
                  </div>
                  <h4 className={`text-xl font-extrabold uppercase tracking-tight transition-colors ${theme.newsArticleTitle}`}>
                    {event.title}
                  </h4>
                  <p className={`mt-4 text-sm font-medium leading-relaxed line-clamp-3 ${theme.newsExcerpt}`}>
                    {event.excerpt}
                  </p>
                  <Link
                    to={event.id ? `${agendaPath}?article=${encodeURIComponent(String(event.id))}` : agendaPath}
                    className={`inline-block mt-6 text-[11px] font-black uppercase tracking-widest transition-colors border-b-2 pb-1 w-fit ${theme.newsLink}`}
                  >
                      {t("agenda.read_article", "Lire l'article")}
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap');
        /* Focus visible pour l'accessibilite clavier */
        a:focus { outline: 3px solid ${theme.focusColor}; outline-offset: 4px; border-radius: 4px; }
      `}</style>
      </main>
    </>
  );
}

