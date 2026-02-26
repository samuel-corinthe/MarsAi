import React, {
  useMemo,
  useState,
  useRef,
  useEffect,
  useCallback,
} from "react";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";

// --- Dictionnaire de secours pour les slugs Arabes ---
// Cela permet de faire le lien entre le nom affiché et l'URL WP
const AR_SLUG_MAP = {
  سوبرانو: "soprano",
  soprano: "soprano",
  // Ajoute ici les autres membres si nécessaire :
  // "nom_arabe": "nom_latin"
};

const createSlug = (text, lang = "fr") => {
  if (!text) return "";

  // Si on est en arabe, on regarde d'abord notre dictionnaire
  let baseText = text.toString().toLowerCase().trim();
  if (lang === "ar" && AR_SLUG_MAP[baseText]) {
    baseText = AR_SLUG_MAP[baseText];
  }

  const baseSlug = baseText
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "-")
    .replace(/[^\w\-]+/g, "")
    .replace(/\-\-+/g, "-");

  if (lang === "en") return `${baseSlug}-eng`;
  if (lang === "ar") return `${baseSlug}-ar`;
  return baseSlug;
};

const parseJuryData = (html, lang) => {
  if (typeof window === "undefined" || !html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");

  return Array.from(doc.querySelectorAll("li"))
    .map((li) => {
      const img = li.querySelector("img");
      const strong = li.querySelector("strong") || li.querySelector("b");

      let name = "";
      if (strong) name = strong.textContent.trim();
      else if (img?.alt) name = img.alt.trim();
      else name = li.textContent.trim().split(/\s+/)[0];

      const role = li.textContent.replace(name, "").trim();
      const manualSlug = li.getAttribute("data-slug");

      return {
        slug: manualSlug || createSlug(name, lang),
        name,
        role,
        imgSrc: img?.src,
      };
    })
    .filter((m) => m.name);
};

const articleCache = new Map();

// --- Style Components ---
const Background = () => (
  <div className="fixed inset-0 pointer-events-none z-0">
    <div className="absolute inset-0 bg-gradient-to-br from-[#020617] via-[#1e3a8a] to-[#172554]" />
    <div className="absolute top-[-10%] left-[-10%] w-[800px] h-[800px] bg-blue-600/20 rounded-full blur-[120px] opacity-40" />
    <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10 mix-blend-overlay" />
  </div>
);

export default function JuryWpage({ page: initialPage }) {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(initialPage);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);
  const isRTL = i18n.language === "ar";

  useEffect(() => {
    const fetchPage = async () => {
      let slug =
        i18n.language === "ar"
          ? "jury-ar"
          : i18n.language === "en"
            ? "jury-eng"
            : "jury";
      try {
        const res = await fetch(
          `https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-json/wp/v2/pages?slug=${slug}`,
        );
        const data = await res.json();
        if (data?.[0]) setPage(data[0]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchPage();
  }, [i18n.language]);

  const members = useMemo(
    () => parseJuryData(page?.content?.rendered, i18n.language),
    [page, i18n.language],
  );

  const openArticle = useCallback(
    async (member) => {
      if (!member?.slug) return;
      const cacheKey = `${member.slug}_${i18n.language}`;

      if (articleCache.has(cacheKey))
        return setSelected(articleCache.get(cacheKey));

      setLoading(true);
      setSelected({
        title: { rendered: member.name },
        content: { rendered: "" },
        isLoading: true,
        slug: member.slug,
      });

      try {
        const res = await fetch(
          `https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-json/wp/v2/posts?slug=${member.slug}`,
        );
        const data = await res.json();

        if (data && data.length > 0) {
          articleCache.set(cacheKey, data[0]);
          setSelected(data[0]);
        } else {
          // Si le slug exact échoue, on tente une recherche par titre
          const resSearch = await fetch(
            `https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-json/wp/v2/posts?search=${encodeURIComponent(member.name)}`,
          );
          const dataSearch = await resSearch.json();
          if (dataSearch?.[0]) {
            setSelected(dataSearch[0]);
          } else {
            setSelected(null);
          }
        }
      } catch (e) {
        setSelected(null);
      } finally {
        setLoading(false);
      }
    },
    [i18n.language],
  );

  useEffect(() => {
    if (selected && scrollRef.current) {
      setTimeout(
        () =>
          scrollRef.current.scrollIntoView({
            behavior: "smooth",
            block: "start",
          }),
        100,
      );
    }
  }, [selected]);

  return (
    <>
      <Seo title={page?.title?.rendered || "Jury"} />
      <main
        className={`min-h-screen w-full bg-[#0f172a] text-white py-20 px-4 relative ${isRTL ? "text-right" : "text-left"}`}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <Background />

        <div className="relative z-10 text-center mb-16 max-w-4xl mx-auto flex flex-col items-center">
          <h1
            className="text-5xl md:text-7xl font-black mb-6 tracking-tighter uppercase"
            dir={isRTL ? "ltr" : "ltr"}
          >
            {" "}
            {/* On force l'ordre des blocs en LTR */}
            {isRTL ? (
              <>
                {/* 1. Le chiffre s'affiche à GAUCHE (après le texte en lecture arabe) */}
                <span className="mr-4">2026</span>

                {/* 2. Le texte s'affiche à DROITE */}
                <span dir="rtl">
                  {page?.title?.rendered.replace("2026", "").trim()}
                </span>
              </>
            ) : (
              <span
                dangerouslySetInnerHTML={{ __html: page?.title?.rendered }}
              />
            )}
          </h1>
          <p className="text-[#cbd5e1] text-lg max-w-2xl">
            {t("jury.jury_subtitle")}
          </p>
        </div>

        {selected && (
          <div
            ref={scrollRef}
            className="relative z-20 w-full max-w-4xl mx-auto mb-24 animate-in fade-in slide-in-from-bottom-8 duration-500"
          >
            <div className="bg-[#1e293b] rounded-[2.5rem] overflow-hidden shadow-2xl border border-[#334155]">
              <div className="p-8 border-b border-white/5 flex justify-between items-center">
                <h2
                  className="text-3xl font-black uppercase"
                  dangerouslySetInnerHTML={{ __html: selected.title.rendered }}
                />
                <button
                  onClick={() => setSelected(null)}
                  className="text-4xl hover:text-blue-400 transition-colors"
                >
                  ×
                </button>
              </div>
              <div className="p-8 md:p-14">
                {loading ? (
                  <div className="flex justify-center">
                    <div className="w-10 h-10 border-4 border-t-blue-500 rounded-full animate-spin" />
                  </div>
                ) : (
                  <div
                    className="prose prose-lg prose-invert max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: selected.content.rendered,
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        )}

        <div className="relative z-10 w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {members.map((m) => (
            <div
              key={m.slug}
              onClick={() => openArticle(m)}
              className={`group flex items-center gap-8 p-8 rounded-[2rem] border cursor-pointer transition-all duration-500 bg-[#1e293b] hover:bg-[#24334d] shadow-xl border-white/5 hover:border-blue-500/40 ${selected?.slug === m.slug ? "border-blue-500 ring-2 ring-blue-500/20" : ""}`}
            >
              <img
                src={m.imgSrc}
                alt={m.name}
                className="w-24 h-24 md:w-28 md:h-28 object-cover rounded-full ring-4 ring-white/5 group-hover:ring-blue-500 transition-all"
              />
              <div>
                <h3 className="text-xl md:text-2xl font-black mb-2 uppercase">
                  {m.name}
                </h3>
                <p className="text-xs font-black text-blue-400 uppercase tracking-widest">
                  {m.role}
                </p>
              </div>
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
