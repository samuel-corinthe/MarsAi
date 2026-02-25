import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { useTheme } from "../context/ThemeContext";

const THEMES = {
  dark: {
    pageBg: "bg-gradient-to-b from-[#020617] via-[#0b1732] to-[#020617]",
    pageText: "text-slate-100",
    glowA: "bg-cyan-500/15",
    glowB: "bg-indigo-500/12",
    badge: "border-cyan-300/45 bg-cyan-400/10 text-cyan-200",
    switchBtn:
      "border-slate-500/60 bg-slate-900/70 text-slate-200 hover:border-cyan-300/60 hover:text-cyan-100",
    iconWrap: "border-cyan-400/70",
    iconColor: "text-cyan-200",
    title: "text-white",
    subtitle: "text-slate-300",
    card: "border-slate-500/35 bg-slate-900/45 hover:border-cyan-300/45",
    cardSelected: "border-cyan-300/55",
    cardDim: "opacity-35",
    name: "text-white",
    role: "text-cyan-200",
    empty: "border-slate-500/35 bg-slate-900/45 text-slate-300",
    modalOverlay: "bg-slate-950/70 backdrop-blur-sm",
    modalPanel: "border-slate-500/40 bg-slate-900/95",
    modalBorder: "border-slate-500/25",
    modalLabel: "text-cyan-200",
    modalTitle: "text-white",
    modalClose:
      "border-slate-500/45 bg-slate-950/70 text-slate-200 hover:border-cyan-300/55 hover:text-cyan-100",
    prose:
      "prose-invert prose-headings:text-white prose-p:text-slate-200 prose-a:text-cyan-200 prose-strong:text-white",
  },
  light: {
    pageBg: "bg-gradient-to-b from-[#f4fbff] via-[#ebf6ff] to-[#f8fcff]",
    pageText: "text-slate-900",
    glowA: "bg-sky-400/20",
    glowB: "bg-cyan-300/20",
    badge: "border-sky-300/70 bg-sky-100 text-sky-800",
    switchBtn:
      "border-sky-200 bg-white/95 text-slate-700 hover:border-sky-400 hover:text-sky-700",
    iconWrap: "border-sky-400/70",
    iconColor: "text-sky-700",
    title: "text-slate-900",
    subtitle: "text-slate-600",
    card: "border-sky-200/90 bg-white/90 hover:border-sky-400",
    cardSelected: "border-sky-500/80 ring-1 ring-sky-300/60",
    cardDim: "opacity-55",
    name: "text-slate-900",
    role: "text-sky-700",
    empty: "border-sky-200 bg-white/90 text-slate-600",
    modalOverlay: "bg-slate-900/35 backdrop-blur-sm",
    modalPanel: "border-sky-200 bg-white/95",
    modalBorder: "border-sky-200/80",
    modalLabel: "text-sky-700",
    modalTitle: "text-slate-900",
    modalClose:
      "border-sky-200 bg-white text-slate-700 hover:border-sky-400 hover:text-sky-700",
    prose:
      "prose-slate prose-headings:text-slate-900 prose-p:text-slate-700 prose-a:text-sky-700 prose-strong:text-slate-900",
  },
};

const createSlug = (text, lang = "fr") => {
  const baseSlug =
    text
      ?.toString()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-") || "";

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
        slug: li.getAttribute("data-slug") || createSlug(name || img?.alt, lang),
        name,
        role: (li.textContent || "").replace(name, "").trim(),
        imgSrc: img?.src,
      };
    })
    .filter((item) => item.slug);
};

const articleCache = new Map();

function Background({ theme }) {
  return (
    <div className="pointer-events-none fixed inset-0 z-0">
      <div className={`absolute inset-0 ${theme.pageBg}`} />
      <div className={`absolute -right-20 -top-28 h-72 w-72 rounded-full blur-3xl ${theme.glowA}`} />
      <div className={`absolute -left-20 top-48 h-72 w-72 rounded-full blur-3xl ${theme.glowB}`} />
    </div>
  );
}

function GavelIcon({ theme }) {
  return (
    <div
      className={`mb-7 inline-flex h-16 w-16 items-center justify-center rounded-full border-4 shadow-[0_10px_30px_rgba(0,0,0,0.35)] ${theme.iconWrap}`}
    >
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-7 w-7 ${theme.iconColor}`}
      >
        <path d="m14.5 12.5-8 8a2.119 2.119 0 1 1-3-3l8-8m9.5 3.5 6-6m-14 14 6-6m-5 5 8 8m12 4-8-8" />
      </svg>
      
    </div>
  );
}

export default function JuryWpage({ page }) {
  const { t, i18n } = useTranslation();
  const { themeMode } = useTheme();

  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);
  const abortRef = useRef(null);

  useEffect(() => {
    if (!selected || typeof window === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelected(null);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [selected]);

  const theme = themeMode === "light" ? THEMES.light : THEMES.dark;

  const openArticle = useCallback(
    async (slug) => {
      if (!slug) return;

      const cacheKey = `${slug}_${i18n.language}`;
      if (articleCache.has(cacheKey)) {
        setLoading(false);
        setSelected(articleCache.get(cacheKey));
        return;
      }

      setLoading(true);
      setSelected({
        slug,
        title: { rendered: t("jury.loading") },
        content: { rendered: "" },
        isLoading: true,
      });

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        const response = await fetch(
          `https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-json/wp/v2/posts?slug=${encodeURIComponent(slug)}&_fields=id,title,content,excerpt,slug&lang=${i18n.language}`,
          { signal: abortRef.current.signal },
        );

        const data = await response.json();

        if (data && data.length > 0) {
          articleCache.set(cacheKey, data[0]);
          setSelected(data[0]);
          return;
        }

        setSelected(null);
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error(error);
          setSelected(null);
        }
      } finally {
        setLoading(false);
      }
    },
    [i18n.language, t],
  );

  const members = useMemo(
    () => parseJuryData(page?.content?.rendered || "", i18n.language),
    [page, i18n.language],
  );

  const title = page?.title?.rendered || t("jury.jury_title");
  const seoTitle = page?.title?.rendered || t("jury.jury_title");
  const seoDescription = t(
    "jury.jury_subtitle",
    "Rencontrez les experts visionnaires de notre selection officielle.",
  );

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />

      <main className={`relative min-h-screen overflow-x-hidden px-4 pb-20 pt-14 ${theme.pageBg} ${theme.pageText}`}>
        <Background theme={theme} />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <header className="mb-12 text-center sm:mb-14">
            <p
              className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${theme.badge}`}
            >
              {t("jury.jury_profile_label", "Profil jury")}
            </p>

            <div className="mt-4">
              <GavelIcon theme={theme} />
            </div>

            <h1
              className={`text-3xl font-black uppercase tracking-tight sm:text-5xl ${theme.title}`}
              dangerouslySetInnerHTML={{ __html: title }}
            />
            <p className={`mx-auto mt-3 max-w-3xl text-sm leading-relaxed sm:text-base ${theme.subtitle}`}>
              {seoDescription}
            </p>
          </header>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {members.map((member) => {
              const isSelected = selected && !selected.isLoading && selected.slug === member.slug;
              const isDimmed = selected && !isSelected;

              return (
                <article
                  key={member.slug}
                  onClick={() => openArticle(member.slug)}
                  className={`group flex cursor-pointer flex-col items-center gap-4 rounded-[24px] border p-4 text-center shadow-[0_18px_40px_rgba(0,0,0,0.2)] transition duration-300 sm:flex-row sm:gap-6 sm:rounded-[28px] sm:p-6 sm:text-left ${theme.card} ${isSelected ? theme.cardSelected : ""} ${isDimmed ? theme.cardDim : "opacity-100"}`}
                >
                  <img
                    src={member.imgSrc || "https://via.placeholder.com/150"}
                    alt={member.name}
                    className="h-20 w-20 shrink-0 rounded-full border-4 border-current/20 object-cover sm:h-24 sm:w-24"
                    loading="lazy"
                  />

                  <div className="min-w-0">
                    <h3 className={`truncate text-lg font-black uppercase tracking-tight sm:text-xl ${theme.name}`}>
                      {member.name}
                    </h3>
                    <p className={`mt-1 text-[10px] font-black uppercase tracking-[0.18em] sm:text-xs ${theme.role}`}>
                      {member.role}
                    </p>
                  </div>
                </article>
              );
            })}
          </section>

          {members.length === 0 && (
            <div
              className={`rounded-[24px] border p-8 text-center text-sm font-black uppercase tracking-[0.2em] sm:rounded-[28px] ${theme.empty}`}
            >
              {t("jury.no_members", "Aucun membre detecte.")}
            </div>
          )}
        </div>

        {selected && (
          <div className={`fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-6 ${theme.modalOverlay}`}>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="absolute inset-0"
              aria-label={t("jury.close_profile", "Fermer le profil")}
            />

            <article
              role="dialog"
              aria-modal="true"
              aria-label={t("jury.jury_profile_label", "Profil jury")}
              className={`relative flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border shadow-[0_30px_80px_rgba(2,6,23,0.4)] sm:rounded-[30px] ${theme.modalPanel}`}
            >
              <div className={`flex items-start justify-between gap-4 border-b px-5 py-4 sm:px-7 sm:py-6 ${theme.modalBorder}`}>
                <div>
                  <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${theme.modalLabel}`}>
                    {selected.isLoading
                      ? t("jury.jury.loading")
                      : t("jury.jury_profile_label", "Profil jury")}
                  </p>
                  <h2
                    className={`mt-2 text-xl font-black uppercase tracking-tight sm:text-3xl ${theme.modalTitle}`}
                    dangerouslySetInnerHTML={{ __html: selected.title.rendered }}
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className={`inline-flex h-10 w-10 items-center justify-center rounded-full border transition ${theme.modalClose}`}
                  aria-label={t("jury.close_profile", "Fermer le profil")}
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>

              <div className="overflow-y-auto p-5 sm:p-7 md:p-8">
                {loading ? (
                  <div className="flex items-center justify-center py-20">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-300/40 border-t-cyan-400" />
                  </div>
                ) : (
                  <div
                    className={`prose max-w-none ${theme.prose}`}
                    dangerouslySetInnerHTML={{ __html: selected.content.rendered }}
                  />
                )}
              </div>

              <div className={`border-t px-5 py-4 text-center sm:px-7 ${theme.modalBorder}`}>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className={`text-[10px] font-black uppercase tracking-[0.2em] transition hover:opacity-80 ${theme.modalLabel}`}
                >
                  {t("jury.close_profile", "Fermer le profil")}
                </button>
              </div>
            </article>
          </div>
        )}
      </main>
    </>
  );
}
