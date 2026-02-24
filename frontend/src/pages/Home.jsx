import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import HomeModelViewer from "../components/HomeModelViewer";
import Seo from "../components/Seo";
import { OrganizationSchema, EventSchema, WebSiteSchema } from "../components/Schema";
import { useTranslation } from "react-i18next";

export default function Home({ page }) {
  const { i18n, t } = useTranslation();
  const modelSrc =
    import.meta.env.VITE_HOME_MODEL_URL ||
    `${import.meta.env.BASE_URL}models/walking_robot_mr.glb`;
  const modelPoster = import.meta.env.VITE_HOME_MODEL_POSTER_URL || "";
  const submitFilmPath =
    i18n.language === "en" ? "/submit-film" : "/deposer-un-film";
  const agendaPath = i18n.language === "en" ? "/schedule" : "/agenda";
  const callForProjectsPath =
    i18n.language === "en" ? "/call-for-project" : "/appel-a-projet";
  const partnersPath = i18n.language === "en" ? "/partners" : "/partenaires";
  const aboutPath = i18n.language === "en" ? "/about" : "/a-propos";
  const moviesPath = i18n.language === "en" ? "/movies" : "/films";
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

    return { title: page?.title?.rendered || "", heroLead, heroLinks, aboutTitle, aboutText, articles };
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

      {/* --- HERO (Accessibilite : contraste eleve) --- */}
      <section className="relative min-h-[85vh] flex items-center justify-center text-center px-6 pt-16 md:pt-20 pb-20">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#1e293b] via-[#0f172a] to-[#0f172a] z-0" />
        <div className="relative z-20 max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-8xl font-black uppercase tracking-tighter leading-none text-white mb-10 drop-shadow-md"
              dangerouslySetInnerHTML={{ __html: parsed.title }} />

          {parsed.heroLead && (
            <p className="text-[#cbd5e1] text-lg md:text-xl max-w-2xl mx-auto font-medium leading-relaxed">
              {parsed.heroLead}
            </p>
          )}

          <div className="mt-12 flex flex-col sm:flex-row gap-6 justify-center">
            {parsed.heroLinks.map((l, i) =>
              l.href.startsWith("/") ? (
                <Link
                  key={i}
                  to={l.href}
                  aria-label={`Acceder a ${l.text}`}
                  className="px-12 py-5 rounded-full bg-[#38bdf8] text-[#0f172a] font-black uppercase tracking-widest text-[12px] hover:bg-white transition-colors shadow-lg"
                >
                  {l.text}
                </Link>
              ) : (
                <a
                  key={i}
                  href={l.href}
                  aria-label={`Acceder a ${l.text}`}
                  className="px-12 py-5 rounded-full bg-[#38bdf8] text-[#0f172a] font-black uppercase tracking-widest text-[12px] hover:bg-white transition-colors shadow-lg"
                >
                  {l.text}
                </a>
              )
            )}
          </div>

          <HomeModelViewer
            only="mobile"
            src={modelSrc}
            poster={modelPoster || undefined}
            alt="Objet 3D MarsAI"
            className="mt-8 mx-auto w-36 h-36 sm:w-44 sm:h-44 cursor-grab active:cursor-grabbing"
          />
        </div>

        <HomeModelViewer
          only="desktop"
          src={modelSrc}
          poster={modelPoster || undefined}
          alt="Objet 3D MarsAI"
          className="absolute right-6 lg:right-16 top-1/2 -translate-y-1/2 w-56 h-56 lg:w-72 lg:h-72 z-10 cursor-grab active:cursor-grabbing"
        />
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
                <div className="aspect-square rounded-3xl bg-[#0f172a] border border-[#334155] overflow-hidden shadow-inner">
                   <img src="https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=2059"
                        className="w-full h-full object-cover filter contrast-[1.1]"
                        alt="Illustration de la section a propos" />
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

