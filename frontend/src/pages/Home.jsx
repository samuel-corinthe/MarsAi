import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import HomeModelViewer from "../components/HomeModelViewer";
import Seo from "../components/Seo";
import { OrganizationSchema, EventSchema, WebSiteSchema } from "../components/Schema";
import { useTranslation } from "react-i18next";
import { getSitePhaseState } from "../api";
import PhaseCountdownBanner from "../components/phases/PhaseCountdownBanner";

export default function Home({ page }) {
  const { i18n, t } = useTranslation();
  const [sitePhase, setSitePhase] = useState(null);
  const [phaseLoaded, setPhaseLoaded] = useState(false);
  const modelSrc =
    import.meta.env.VITE_HOME_MODEL_URL ||
    `${import.meta.env.BASE_URL}models/walking_robot_mr.glb`;
  const modelPoster = import.meta.env.VITE_HOME_MODEL_POSTER_URL || "";
  const submitFilmPath =
    i18n.language === "en" ? "/submit-film" : "/deposer-un-film";
  const participateVideoUrl =
    import.meta.env.VITE_HOME_PARTICIPATE_VIDEO_URL
    || "https://cdn.pixabay.com/video/2023/07/28/173530-849610807_large.mp4";
  const agendaPath = i18n.language === "en" ? "/schedule" : "/agenda";
  const callForProjectsPath =
    i18n.language === "en" ? "/call-for-project" : "/appel-a-projet";
  const partnersPath = i18n.language === "en" ? "/partners" : "/partenaires";
  const aboutPath = i18n.language === "en" ? "/about" : "/a-propos";
  const moviesPath = i18n.language === "en" ? "/movies" : "/films";
  const currentPhaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
  const isCallForProjectsPhase = currentPhaseKey === "phase_1";
  const heroCtaPath = isCallForProjectsPhase ? submitFilmPath : moviesPath;
  const heroCtaBadge = i18n.language === "en"
    ? (isCallForProjectsPhase ? "Call for projects" : "Official selection")
    : (isCallForProjectsPhase ? "Appel a projet" : "Selection officielle");
  const heroCtaTitle = i18n.language === "en"
    ? (isCallForProjectsPhase ? "Participate" : "Watch films")
    : (isCallForProjectsPhase ? "Participer" : "Visionner les films");
  const heroCtaSubtitle = i18n.language === "en"
    ? (isCallForProjectsPhase ? "Click to submit your film" : "Click to open the gallery")
    : (isCallForProjectsPhase ? "Clique pour deposer ton film" : "Clique pour ouvrir la galerie");
  const heroCtaAria = i18n.language === "en"
    ? (isCallForProjectsPhase ? "Submit your film" : "Open movie gallery")
    : (isCallForProjectsPhase ? "Deposer un film" : "Ouvrir la galerie des films");

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
        "/agenda": agendaPath,
        "/schedule": agendaPath,
        "/appel-a-projet": callForProjectsPath,
        "/appel-a-projets": callForProjectsPath,
        "/call-for-project": callForProjectsPath,
        "/call-for-projects": callForProjectsPath,
        "/partenaires": partnersPath,
        "/partners": partnersPath,
        "/a-propos": aboutPath,
        "/about": aboutPath,
        "/films": moviesPath,
        "/movies": moviesPath,
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

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <OrganizationSchema />
      <EventSchema />
      <WebSiteSchema />
      <main className="w-full overflow-hidden bg-[#0f172a] text-white font-['Montserrat']">

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
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#020617]/55 via-[#020617]/65 to-[#020617]/90" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.25),_transparent_48%)]" />

        <Link
          to={heroCtaPath}
          aria-label={heroCtaAria}
          className="relative z-20 flex min-h-screen w-full items-center justify-center px-4 text-center sm:px-6"
        >
          <div className="group w-full max-w-3xl rounded-[2rem] border border-cyan-200/25 bg-slate-900/35 px-4 py-8 backdrop-blur-md transition-all duration-500 hover:scale-[1.02] hover:border-cyan-200/60 hover:bg-slate-900/55 sm:rounded-[2.5rem] sm:px-8 sm:py-10 md:px-14 md:py-14">
            <p className="mb-4 text-[11px] font-black uppercase tracking-[0.35em] text-cyan-200/90">
              {heroCtaBadge}
            </p>
            <h2 className="text-4xl font-black uppercase tracking-tight text-white sm:text-5xl md:text-7xl">
              {heroCtaTitle}
            </h2>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.16em] text-slate-100/90 sm:mt-6 sm:text-sm sm:tracking-[0.2em] md:text-base">
              {heroCtaSubtitle}
            </p>
          </div>
        </Link>
      </section>

      {/* --- INTRO + COMPTEUR --- */}
      <section className="relative py-16 md:py-24 bg-[#0f172a]">
        <div className="max-w-6xl mx-auto px-6 md:px-10">
          <div className="rounded-[2.5rem] border border-cyan-300/20 bg-[#111b33]/80 p-8 md:p-12 shadow-xl">
            <h1
              className="text-3xl md:text-6xl font-black uppercase tracking-tight leading-[0.95] text-white"
              dangerouslySetInnerHTML={{ __html: parsed.title }}
            />

            {parsed.heroLead && (
              <p className="mt-6 text-[#cbd5e1] text-base md:text-xl max-w-3xl font-medium leading-relaxed">
                {parsed.heroLead}
              </p>
            )}

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              {parsed.heroLinks.map((l, i) =>
                l.href.startsWith("/") ? (
                  <Link
                    key={i}
                    to={l.href}
                    aria-label={`Acceder a ${l.text}`}
                    className="px-8 py-4 rounded-full bg-[#38bdf8] text-[#0f172a] font-black uppercase tracking-widest text-[11px] hover:bg-white transition-colors shadow-lg text-center"
                  >
                    {l.text}
                  </Link>
                ) : (
                  <a
                    key={i}
                    href={l.href}
                    aria-label={`Acceder a ${l.text}`}
                    className="px-8 py-4 rounded-full bg-[#38bdf8] text-[#0f172a] font-black uppercase tracking-widest text-[11px] hover:bg-white transition-colors shadow-lg text-center"
                  >
                    {l.text}
                  </a>
                ),
              )}
            </div>

            {phaseLoaded && (
              <div className="mt-8">
                <PhaseCountdownBanner
                  sitePhase={sitePhase}
                  language={i18n.language}
                  variant="home"
                />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* --- ABOUT (Plus clair pour la lecture prolongee) --- */}
      {(parsed.aboutTitle || parsed.aboutText) && (
        <section className="relative py-24 md:py-40 bg-[#0f172a]">
          <div className="max-w-5xl mx-auto px-10">
            <div className="bg-[#1e293b] border border-[#334155] rounded-[3rem] p-5 md:p-20 shadow-xl">
              <div className="grid md:grid-cols-2 gap-16 items-center">
                <div>
                  <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-8">
                    {parsed.aboutTitle}
                  </h2>
                  <p className="text-[#e2e8f0] text-lg leading-relaxed font-medium">
                    {parsed.aboutText}
                  </p>
                </div>
                <div className="rounded-3xl bg-[#0f172a] border border-[#334155] overflow-hidden shadow-inner p-6 md:p-8">
                  <HomeModelViewer
                    src={modelSrc}
                    poster={modelPoster || undefined}
                    alt="Objet 3D MarsAI"
                    className="mx-auto w-56 h-56 md:w-72 md:h-72 cursor-grab active:cursor-grabbing"
                  />
                  <p className="mt-6 text-center text-xs font-black uppercase tracking-[0.25em] text-cyan-200/90">
                    MarsAI Lab
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* --- NEWS (Cartes plus contrastees et aeres) --- */}
      {parsed.articles.length > 0 && (
        <section className="relative py-20 md:py-32 bg-[#0f172a]">
          <div className="max-w-4xl mx-auto px-10 md:px-4">
            <h3 className="text-2xl md:text-4xl font-black uppercase tracking-[0.4em] text-[#38bdf8] mb-24 text-center">
              {t("home_news", "Actualites")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-16 md:gap-12 justify-items-center">
              {parsed.articles.slice(0, 6).map((a, i) => (
                <article key={i} className="group w-full max-w-[280px] flex flex-col">
                  <div className="aspect-[3/4] rounded-[2.5rem] bg-[#1e293b] mb-8 overflow-hidden border border-[#334155] shadow-lg">
                    <div className="w-full h-full bg-gradient-to-t from-[#0f172a] to-transparent" />
                  </div>
                  <h4 className="text-xl font-extrabold uppercase tracking-tight text-white group-hover:text-[#38bdf8] transition-colors">
                    {a.title}
                  </h4>
                  <p className="mt-4 text-[#94a3b8] text-sm font-medium leading-relaxed line-clamp-3">
                    {a.excerpt}
                  </p>
                  {a.link && (
                    <a href={a.link}
                       className="inline-block mt-6 text-[11px] font-black uppercase tracking-widest text-[#38bdf8] hover:text-white transition-colors border-b-2 border-[#38bdf8] pb-1 w-fit">
                      {t("agenda.read_article", "Lire l'article")}
                    </a>
                  )}
                </article>
              ))}
            </div>
          </div>
        </section>
      )}

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@500;700;900&display=swap');
        body { background-color: #0f172a; color: #ffffff; }
        /* Focus visible pour l'accessibilite clavier */
        a:focus { outline: 3px solid #38bdf8; outline-offset: 4px; border-radius: 4px; }
      `}</style>
      </main>
    </>
  );
}

