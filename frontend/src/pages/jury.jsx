import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";

// --- Helpers ---
const createSlug = (text, lang = "fr") => {
  const baseSlug =
    text
      ?.toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w\-]+/g, "")
      .replace(/\-\-+/g, "-") || "";

  // Si la langue est l'anglais, on ajoute le suffixe utilisé dans tes slugs WP
  if (lang === "en" && baseSlug) {
    return `${baseSlug}-eng`;
  }
  return baseSlug;
};

const parseJuryData = (html, lang) => {
  if (typeof window === "undefined") return [];
  return Array.from(
    new DOMParser().parseFromString(html, "text/html").querySelectorAll("li"),
  )
    .map((li) => {
      const img = li.querySelector("img");
      const strong = li.querySelector("strong") || li.querySelector("b");
      const name = strong ? strong.textContent : "";
      return {
        // Priorité au data-slug si présent, sinon génération auto avec suffixe langue
        slug:
          li.getAttribute("data-slug") || createSlug(name || img?.alt, lang),
        name,
        role: (li.textContent || "").replace(name, "").trim(),
        imgSrc: img?.src,
      };
    })
    .filter((i) => i.slug);
};

const articleCache = new Map();

// --- Components ---
const Background = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#1e3a8a] to-[#172554]" />
    <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] mix-blend-screen opacity-40" />
    <div className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[100px] opacity-30" />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
  </div>
);

const GavelIcon = () => (
  <div className="mb-8 p-5 bg-[#1e293b]/50 backdrop-blur-md rounded-full shadow-[0_0_30px_rgba(37,99,235,0.2)] border border-white/10 ring-1 ring-blue-500/30">
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-10 h-10 text-blue-400"
    >
      <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8m9.5 3.5 6-6m-14 14 6-6m-5 5 8 8m12 4-8-8" />
    </svg>
  </div>
);

export default function JuryWpage({ page }) {
  const { t, i18n } = useTranslation();
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const abortRef = useRef(null);

  const openArticle = useCallback(
    async (slug) => {
      if (!slug) return;

      const cacheKey = `${slug}_${i18n.language}`;
      if (articleCache.has(cacheKey))
        return setSelected(articleCache.get(cacheKey));

      setLoading(true);
      // État temporaire pour déclencher l'affichage du bloc
      setSelected({
        slug,
        title: { rendered: t("jury.loading") },
        content: { rendered: "" },
        isLoading: true,
      });

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch(
          `https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,title,content,excerpt,slug&lang=${i18n.language}`,
          { signal: abortRef.current.signal },
        );
        const data = await res.json();

        if (data && data.length > 0) {
          articleCache.set(cacheKey, data[0]);
          setSelected(data[0]);
        } else {
          // Si rien n'est trouvé, on ferme pour éviter le blocage sur "loading"
          console.warn(`Aucun post trouvé pour le slug: ${slug}`);
          setSelected(null);
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error(e);
          setSelected(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [i18n.language, t],
  );

  useEffect(() => {
    if (selected && scrollRef.current)
      setTimeout(
        () =>
          scrollRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
  }, [selected]);

  // On régénère les membres quand la langue change pour mettre à jour les slugs
  const members = useMemo(
    () => parseJuryData(page?.content?.rendered || "", i18n.language),
    [page, i18n.language],
  );

  const title = page?.title?.rendered || t("jury.jury_title");

  return (
    <main className="min-h-screen w-full bg-[#0f172a] text-white font-['Montserrat'] flex flex-col items-center py-20 px-4 relative overflow-x-hidden selection:bg-[#38bdf8] selection:text-[#0f172a]">
      <Background />

      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-5 mix-blend-overlay pointer-events-none z-[60]"></div>

      {/* Header */}
      <div className="relative z-10 text-center mb-16 max-w-4xl flex flex-col items-center pt-10">
        <GavelIcon />
        <h1
          className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tighter drop-shadow-2xl uppercase"
          dangerouslySetInnerHTML={{ __html: title }}
        />
        <p className="text-[#cbd5e1] text-lg md:text-xl max-w-2xl font-medium leading-relaxed">
          {t(
            "jury.jury_subtitle",
            "Rencontrez les experts visionnaires de notre sélection officielle.",
          )}
        </p>
      </div>

      {/* Article Detail */}
      {selected && (
        <div
          ref={scrollRef}
          className="relative z-20 w-full max-w-4xl mb-24 animate-in fade-in slide-in-from-bottom-8 duration-500"
        >
          <div className="bg-[#1e293b] rounded-[2.5rem] overflow-hidden shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-[#334155]">
            <div className="bg-[#1e293b] p-8 md:p-10 border-b border-white/5 flex justify-between items-start">
              <div>
                <span className="text-[#38bdf8] font-black uppercase text-[10px] tracking-[0.2em] mb-3 block">
                  {selected.isLoading
                    ? t("jury.jury.loading")
                    : t("jury.jury_profile_label", "Profil Jury")}
                </span>
                <h2
                  className="text-3xl md:text-4xl font-black text-white leading-none uppercase tracking-tight"
                  dangerouslySetInnerHTML={{ __html: selected.title.rendered }}
                />
              </div>
              <button
                onClick={() => setSelected(null)}
                className="flex items-center justify-center w-12 h-12 rounded-full bg-white/5 hover:bg-[#38bdf8] border border-white/10 transition-all text-white hover:text-[#0f172a]"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="p-8 md:p-14 bg-[#1e293b]">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-white/10 border-t-[#38bdf8] rounded-full animate-spin mb-6" />
                </div>
              ) : (
                <div
                  className="prose prose-lg prose-invert max-w-none 
                                prose-p:text-[#cbd5e1] prose-p:leading-relaxed 
                                prose-headings:text-white prose-headings:font-black 
                                prose-a:text-[#38bdf8] prose-strong:text-white
                                prose-img:rounded-3xl"
                  dangerouslySetInnerHTML={{
                    __html: selected.content.rendered,
                  }}
                />
              )}
            </div>

            <div className="bg-[#0f172a]/30 p-6 text-center border-t border-white/5">
              <button
                onClick={() => setSelected(null)}
                className="text-[10px] uppercase tracking-[0.2em] font-black text-[#94a3b8] hover:text-[#38bdf8] transition-colors"
              >
                {t("jury.close_profile", "Fermer le profil")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="relative z-10 w-full max-w-5xl px-4 md:px-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 justify-items-center">
          {members.map((m) => {
            const isSelected =
              selected && !selected.isLoading && selected.slug === m.slug;
            const isDimmed = selected && !isSelected;

            return (
              <div
                key={m.slug}
                onClick={() => openArticle(m.slug)}
                className={`group relative flex items-center gap-8 p-8 w-full max-w-md rounded-[2rem] border cursor-pointer transition-all duration-500 ease-out bg-[#1e293b] shadow-xl
                  ${!isDimmed ? "hover:bg-[#24334d] hover:border-[#38bdf8]/40 hover:-translate-y-2" : ""}
                  ${isDimmed ? "opacity-30 grayscale blur-[2px]" : "opacity-100 border-white/5"}
                  ${isSelected ? "border-[#38bdf8] ring-2 ring-[#38bdf8]/20" : ""}`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={m.imgSrc || "https://via.placeholder.com/150"}
                    alt={m.name}
                    className={`w-24 h-24 md:w-28 md:h-28 object-cover rounded-full bg-[#0f172a] ring-4 ring-white/5 transition-all duration-500 ${!isDimmed && "group-hover:ring-[#38bdf8] group-hover:scale-105"}`}
                  />
                </div>
                <div className="flex flex-col">
                  <h3 className="text-xl md:text-2xl font-black text-white mb-2 group-hover:text-[#38bdf8] transition-colors uppercase tracking-tight">
                    {m.name}
                  </h3>
                  <p className="text-xs font-black text-[#38bdf8] uppercase tracking-[0.2em]">
                    {m.role}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="text-center py-20 text-[#94a3b8] font-bold uppercase tracking-widest text-sm">
            {t("jury.no_members", "Aucun membre détecté.")}
          </div>
        )}
      </div>
    </main>
  );
}
