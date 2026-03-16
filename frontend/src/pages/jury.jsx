import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { useTheme } from "../context/ThemeContext";
import { getWpPostById, getWpPostsBySearch, getWpPostsBySlug } from "../api";

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

const AR_SLUG_MAP = {
  soprano: "soprano",
  // "???????" stored as escapes to avoid source-encoding issues.
  "\u0633\u0648\u0628\u0631\u0627\u0646\u0648": "soprano",
  // Keep legacy mojibake forms seen in some imported WP content.
  "Ø³ÙˆØ¨Ø±Ø§Ù†Ùˆ": "soprano",
};

const FORCED_JURY_POST_IDS = {
  ar: {
    soprano: 421,
  },
};

const toUnique = (values = []) => [...new Set(values.filter(Boolean))];

const normalizeLookupValue = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const getMappedSlug = (value = "") => {
  const normalized = normalizeLookupValue(value);
  return AR_SLUG_MAP[normalized] || "";
};

const findMappedSlugInText = (value = "") => {
  const normalized = normalizeLookupValue(value);
  if (!normalized) return "";

  if (AR_SLUG_MAP[normalized]) return AR_SLUG_MAP[normalized];

  for (const [key, mapped] of Object.entries(AR_SLUG_MAP)) {
    const safeKey = normalizeLookupValue(key);
    if (safeKey && normalized.includes(safeKey)) return mapped;
  }

  return "";
};

const normalizeLangCode = (value = "fr") => {
  const lang = String(value || "").toLowerCase();
  if (lang.startsWith("ar")) return "ar";
  if (lang.startsWith("en")) return "en";
  return "fr";
};

const buildLangCandidates = (lang = "fr") => {
  const primary = normalizeLangCode(lang);
  if (primary === "ar") return ["fr", "en", "ar"];
  if (primary === "en") return ["en", "fr", "ar"];
  return ["fr", "en", "ar"];
};

const normalizeSlugValue = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const withoutParams = raw.split(/[?#]/)[0].replace(/\/+$/, "");
  const segment = withoutParams.split("/").filter(Boolean).pop() || withoutParams;
  try {
    return decodeURIComponent(segment).trim();
  } catch {
    return segment.trim();
  }
};

const DISPLAY_NAME_MAP = {
  soprano: "Soprano",
};

const ARABIC_NAME_MAP = {
  soprano: "\u0633\u0648\u0628\u0631\u0627\u0646\u0648",
};

const toDisplayNameFromSlug = (value = "") => {
  const slug = normalizeSlugValue(value).replace(/-(ar|eng)$/i, "");
  if (!slug) return "";
  const mapped = DISPLAY_NAME_MAP[slug.toLowerCase()];
  if (mapped) return mapped;

  return slug
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => {
      if (!/[a-z]/i.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
    })
    .join(" ");
};

const toArabicNameFromSlug = (value = "") => {
  const slug = normalizeSlugValue(value).replace(/-(ar|eng)$/i, "").toLowerCase();
  if (!slug) return "";
  return ARABIC_NAME_MAP[slug] || "";
};

const hasArabicChars = (value = "") => /[\u0600-\u06FF]/.test(String(value || ""));

const normalizeInlineSpacing = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const decodeHtmlText = (value = "") => {
  const source = String(value || "");
  if (!source) return "";

  if (typeof window === "undefined") {
    return normalizeInlineSpacing(source.replace(/<[^>]*>/g, " "));
  }

  const doc = new DOMParser().parseFromString(`<div>${source}</div>`, "text/html");
  return normalizeInlineSpacing(doc.body.textContent || "");
};

const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const RTL_INLINE_TOKEN_PATTERN =
  /https?:\/\/[^\s<>"')]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|[A-Za-z0-9]+(?:[./:_-][A-Za-z0-9]+)*/g;

const toRtlSafeInlineHtml = (value = "") => {
  const text = String(value || "");
  if (!text) return "";

  const matches = Array.from(text.matchAll(RTL_INLINE_TOKEN_PATTERN));
  if (!matches.length) return escapeHtml(text);

  let cursor = 0;
  let html = "";

  matches.forEach((match) => {
    const token = match[0];
    const start = match.index ?? 0;
    if (start > cursor) {
      html += escapeHtml(text.slice(cursor, start));
    }
    html += `<bdi class="jury-ltr-token" dir="ltr">${escapeHtml(token)}</bdi>`;
    cursor = start + token.length;
  });

  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }

  return html;
};

const normalizeRtlInlineHtml = (html = "", { isArabic = false } = {}) => {
  if (!html || !isArabic || typeof window === "undefined") return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  const textNodes = [];
  const collectTextNodes = (node) => {
    Array.from(node.childNodes || []).forEach((child) => {
      if (child.nodeType === 3) {
        if (hasArabicChars(child.textContent || "") && /[A-Za-z0-9]/.test(child.textContent || "")) {
          textNodes.push(child);
        }
        return;
      }
      if (child.nodeType === 1) {
        collectTextNodes(child);
      }
    });
  };

  collectTextNodes(root);

  textNodes.forEach((textNode) => {
    const wrapper = doc.createElement("span");
    wrapper.innerHTML = toRtlSafeInlineHtml(textNode.textContent || "");
    const fragment = doc.createDocumentFragment();
    while (wrapper.firstChild) {
      fragment.appendChild(wrapper.firstChild);
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  return root.innerHTML;
};

const splitLeadingLtrTitle = (value = "", { isArabic = false } = {}) => {
  if (!isArabic) return null;

  const text = decodeHtmlText(value);
  if (!text || !hasArabicChars(text)) return null;

  const match = text.match(
    /^\s*([A-Za-z0-9][A-Za-z0-9./:_-]*(?:\s+[A-Za-z0-9][A-Za-z0-9./:_-]*)*)\s*(?=[\u0600-\u06FF])(.+)$/u,
  );

  if (!match) return null;

  return {
    prefix: normalizeInlineSpacing(match[1]),
    rest: normalizeInlineSpacing(match[2]),
  };
};

const getForcedJuryPostId = ({ lang = "fr", slug = "", name = "" } = {}) => {
  const safeLang = normalizeLangCode(lang);
  const byLang = FORCED_JURY_POST_IDS[safeLang];
  if (!byLang) return 0;

  const baseSlug = normalizeSlugValue(slug).replace(/-(ar|eng)$/i, "").toLowerCase();
  const mappedFromName = normalizeSlugValue(getMappedSlug(name)).replace(/-(ar|eng)$/i, "").toLowerCase();

  const id = Number(byLang[baseSlug] || byLang[mappedFromName] || 0);
  return Number.isFinite(id) && id > 0 ? id : 0;
};

const buildSlugCandidates = (rawSlug = "", lang = "fr") => {
  const slug = normalizeSlugValue(rawSlug);
  if (!slug) return [];

  const normalizedLang = normalizeLangCode(lang);
  const baseNoSuffix = slug.replace(/-(ar|eng)$/i, "");
  const mapped = getMappedSlug(slug) || getMappedSlug(baseNoSuffix);
  const candidates = [slug, baseNoSuffix, mapped];

  if (normalizedLang.startsWith("ar")) {
    candidates.push(`${baseNoSuffix}-ar`);
  } else if (normalizedLang.startsWith("en")) {
    candidates.push(`${baseNoSuffix}-eng`);
  }

  return toUnique(candidates.map((value) => normalizeSlugValue(value)));
};

const extractSlugFromHref = (href = "") => {
  const value = String(href || "").trim();
  if (!value || typeof window === "undefined") return "";

  try {
    const pathname = new URL(value, window.location.origin).pathname;
    const segments = pathname.split("/").filter(Boolean);
    return normalizeSlugValue(String(segments[segments.length - 1] || ""));
  } catch {
    return "";
  }
};

const createSlug = (text, lang = "fr") => {
  let sourceText = text?.toString().toLowerCase().trim() || "";
  if (lang === "ar") {
    const mapped = getMappedSlug(sourceText);
    if (mapped) sourceText = mapped;
  }

  const baseSlug =
    sourceText
      ?.toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^\p{L}\p{N}_-]+/gu, "")
      .replace(/--+/g, "-") || "";

  if (lang === "en" && baseSlug) {
    return `${baseSlug}-eng`;
  }
  if (lang === "ar" && baseSlug) {
    return `${baseSlug}-ar`;
  }

  return baseSlug;
};

const parseJuryData = (html, lang) => {
  if (typeof window === "undefined") return [];

  return Array.from(
    new DOMParser().parseFromString(html, "text/html").querySelectorAll("li"),
  )
    .map((li, index) => {
      const img = li.querySelector("img");
      const anchor = li.querySelector("a");
      const strong = li.querySelector("strong") || li.querySelector("b");
      const strongName = strong?.textContent?.trim() || "";
      const anchorName = anchor?.textContent?.trim() || "";
      const imgAlt = img?.alt?.trim() || "";
      const name = strongName || anchorName || imgAlt;
      const rawText = (li.textContent || "").trim();
      const hintText = [
        name,
        rawText,
        li.getAttribute("data-slug"),
        li.getAttribute("data-member-slug"),
        anchor?.getAttribute("data-slug"),
        anchor?.getAttribute("data-member-slug"),
        anchor?.getAttribute("href"),
        imgAlt,
        img?.src,
      ]
        .filter(Boolean)
        .join(" ");
      const mappedFromText = findMappedSlugInText(hintText);
      const slug = normalizeSlugValue(
        li.getAttribute("data-slug") ||
          li.getAttribute("data-member-slug") ||
          anchor?.getAttribute("data-slug") ||
          anchor?.getAttribute("data-member-slug") ||
          extractSlugFromHref(anchor?.getAttribute("href") || anchor?.href) ||
          mappedFromText ||
          getMappedSlug(name) ||
          createSlug(name || imgAlt, lang),
      );
      const isArabicUi = normalizeLangCode(lang) === "ar";
      const mappedSlugForName = getMappedSlug(name) || mappedFromText;
      const arabicDisplayName =
        (hasArabicChars(name) ? name : "") ||
        toArabicNameFromSlug(slug) ||
        toArabicNameFromSlug(mappedSlugForName);
      const displayName =
        (isArabicUi ? arabicDisplayName : "") || name || toDisplayNameFromSlug(slug);
      const role = rawText.replace(displayName || name, "").trim();

      return {
        id: slug || `jury-member-${index + 1}`,
        slug,
        name: displayName,
        role,
        imgSrc: img?.src,
      };
    })
    .filter((item) => item.name || item.role || item.imgSrc);
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
        viewBox="0 0 64 64"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`h-8 w-8 ${theme.iconColor}`}
      >
        <path d="M36.618 31.688 6.278 62.028c-.781.781-2.038.79-2.81.02l-1.452-1.453c-.771-.771-.762-2.028.019-2.81l30.34-30.339" />
        <path d="M43.601 38.847 25.216 20.462" />
        <path d="m37.943 7.734 18.385 18.385" />
        <path d="m28.044 19.049-2.828 2.827c-.781.781-2.048.781-2.828 0l-2.829-2.828c-.78-.781-.78-2.048 0-2.828L33.702 2.077c.781-.78 2.047-.78 2.828 0l2.828 2.829c.781.78.781 2.047.001 2.828l-2.771 2.77" />
        <path d="m53.559 27.475 2.77-2.77c.781-.781 2.048-.781 2.829 0l2.828 2.828c.781.781.781 2.047 0 2.828L47.843 44.504c-.78.781-2.047.781-2.828 0l-2.828-2.828c-.781-.781-.781-2.048 0-2.829l2.827-2.827" />
      </svg>
    </div>
  );
}

export default function JuryWpage({ page }) {
  const { t, i18n } = useTranslation();
  const { themeMode } = useTheme();
  const isArabic = String(i18n.language || "").toLowerCase().startsWith("ar");

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
    async (member) => {
      const memberSlug = normalizeSlugValue(member?.slug || "");
      const memberRole = String(member?.role || "").trim();
      const mappedFromMember = findMappedSlugInText(
        `${member?.name || ""} ${memberRole} ${memberSlug}`,
      );
      const effectiveSlug = memberSlug || mappedFromMember;
      const memberName = String(member?.name || toDisplayNameFromSlug(effectiveSlug) || "").trim();
      const memberSearch = memberName || memberRole || toDisplayNameFromSlug(effectiveSlug);
      if (!effectiveSlug && !memberSearch) return;

      const derivedSlug =
        effectiveSlug || getMappedSlug(memberSearch) || findMappedSlugInText(memberSearch) || createSlug(memberSearch, i18n.language);
      const slugCandidates = derivedSlug ? buildSlugCandidates(derivedSlug, i18n.language) : [];
      const langCandidates = buildLangCandidates(i18n.language);
      const uiLang = normalizeLangCode(i18n.language);
      const postFields = "id,title,content,excerpt,slug,translations,lang";
      const forcedPostId = getForcedJuryPostId({
        lang: uiLang,
        slug: derivedSlug,
        name: memberSearch,
      });
      const forcedCacheKey = forcedPostId ? `forced_${forcedPostId}_${uiLang}` : "";

      const resolveArticleForUiLang = async (article, sourceLang) => {
        if (!article || typeof article !== "object") return null;
        if (uiLang !== "ar") return article;
        if (normalizeLangCode(sourceLang) === "ar") return article;

        const translatedId = Number(article?.translations?.ar || 0);
        if (!Number.isFinite(translatedId) || translatedId <= 0) return article;

        try {
          const translated = await getWpPostById({
            id: translatedId,
            lang: "ar",
            fields: postFields,
            signal: abortRef.current.signal,
          });
          return translated || article;
        } catch {
          return article;
        }
      };

      if (forcedCacheKey && articleCache.has(forcedCacheKey)) {
        setLoading(false);
        setSelected(articleCache.get(forcedCacheKey));
        return;
      }

      for (const candidate of slugCandidates) {
        for (const requestLang of langCandidates) {
          const cacheKey = `${candidate}_${requestLang}`;
          if (articleCache.has(cacheKey)) {
            setLoading(false);
            setSelected(articleCache.get(cacheKey));
            return;
          }
        }
      }

      setLoading(true);
      setSelected({
        slug: derivedSlug || memberSearch,
        title: { rendered: t("jury.loading") },
        content: { rendered: "" },
        isLoading: true,
      });

      if (abortRef.current) abortRef.current.abort();
      abortRef.current = new AbortController();

      try {
        if (forcedPostId > 0) {
          try {
            const forcedArticle = await getWpPostById({
              id: forcedPostId,
              lang: uiLang,
              fields: postFields,
              signal: abortRef.current.signal,
            });

            if (forcedArticle) {
              articleCache.set(forcedCacheKey, forcedArticle);
              buildSlugCandidates(forcedArticle.slug || derivedSlug, uiLang).forEach((variant) => {
                articleCache.set(`${variant}_${uiLang}`, forcedArticle);
              });
              setSelected(forcedArticle);
              return;
            }
          } catch (requestError) {
            if (requestError?.name === "AbortError") throw requestError;
          }
        }

        for (const requestLang of langCandidates) {
          for (const candidate of slugCandidates) {
            let data = [];
            try {
              data = await getWpPostsBySlug({
                slug: candidate,
                lang: requestLang,
                fields: postFields,
                signal: abortRef.current.signal,
              });
            } catch (requestError) {
              if (requestError?.name === "AbortError") throw requestError;
              continue;
            }

            if (data && data.length > 0) {
              const resolved = await resolveArticleForUiLang(data[0], requestLang);
              buildSlugCandidates((resolved && resolved.slug) || candidate, requestLang).forEach((variant) => {
                articleCache.set(`${variant}_${requestLang}`, resolved);
                articleCache.set(`${variant}_${normalizeLangCode(i18n.language)}`, resolved);
              });
              setSelected(resolved);
              return;
            }
          }
        }

        // Fallback: search by displayed member name if slug lookup fails.
        if (memberSearch) {
          for (const requestLang of langCandidates) {
            let searchResults = [];
            try {
              searchResults = await getWpPostsBySearch({
                query: memberSearch,
                lang: requestLang,
                fields: postFields,
                signal: abortRef.current.signal,
              });
            } catch (requestError) {
              if (requestError?.name === "AbortError") throw requestError;
              continue;
            }

            if (Array.isArray(searchResults) && searchResults.length > 0) {
              const resolved = await resolveArticleForUiLang(searchResults[0], requestLang);
              buildSlugCandidates(
                (resolved && resolved.slug) || derivedSlug || createSlug(memberSearch, requestLang),
                requestLang,
              ).forEach((variant) => {
                articleCache.set(`${variant}_${requestLang}`, resolved);
                articleCache.set(`${variant}_${normalizeLangCode(i18n.language)}`, resolved);
              });
              setSelected(resolved);
              return;
            }
          }
        }

        // Keep modal open with a controlled fallback message instead of closing instantly.
        setSelected({
          slug: derivedSlug || memberSearch,
          title: { rendered: memberName || memberSearch || t("jury.jury_profile_label", "Profil jury") },
          content: {
            rendered: `<p>${t("common.load_page_error", "Impossible de charger la page pour le moment.")}</p>`,
          },
        });
      } catch (error) {
        if (error?.name !== "AbortError") {
          console.error(error);
          setSelected({
            slug: derivedSlug || memberSearch,
            title: { rendered: memberName || memberSearch || t("jury.jury_profile_label", "Profil jury") },
            content: {
              rendered: `<p>${t("common.load_page_error", "Impossible de charger la page pour le moment.")}</p>`,
            },
          });
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
  const titleParts = useMemo(
    () => splitLeadingLtrTitle(title, { isArabic }),
    [isArabic, title],
  );
  const displayTitle = useMemo(
    () => normalizeRtlInlineHtml(title, { isArabic }),
    [isArabic, title],
  );
  const seoDescription = t(
    "jury.jury_subtitle",
    "Rencontrez les experts visionnaires de notre selection officielle.",
  );

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />

      <main
        className={`relative min-h-screen overflow-x-hidden px-4 pb-20 pt-14 ${theme.pageBg} ${theme.pageText}`}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <Background theme={theme} />

        <div className="relative z-10 mx-auto w-full max-w-6xl">
          <header className="mb-12 text-center sm:mb-14">
            <p
              className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${theme.badge}`}
            >
              {t("jury.jury_profile_label", "Profil jury")}
            </p>

            <div className="mt-4">
              <GavelIcon theme={theme} />
            </div>

            <h1
              className={`text-3xl font-black uppercase tracking-tight sm:text-5xl ${theme.title}`}
            >
              {titleParts ? (
                <span className="jury-title-inline" dir="ltr">
                  <span className="jury-title-prefix" dir="ltr">{titleParts.prefix}</span>
                  <span className="jury-title-rest" dir="rtl">{titleParts.rest}</span>
                </span>
              ) : (
                <span dangerouslySetInnerHTML={{ __html: displayTitle }} />
              )}
            </h1>
            <p className={`mx-auto mt-3 max-w-3xl text-sm leading-relaxed sm:text-base ${theme.subtitle}`}>
              {seoDescription}
            </p>
          </header>

          <section className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {members.map((member) => {
              const isSelected = selected && !selected.isLoading && selected.slug === member.slug;
              const isDimmed = selected && !isSelected;
              const canOpen = Boolean(member.slug || member.name || member.role);

              return (
                <article
                  key={member.id}
                  onClick={canOpen ? () => openArticle(member) : undefined}
                  className={`group flex flex-col items-center gap-4 rounded-[24px] border p-4 text-center shadow-[0_18px_40px_rgba(0,0,0,0.2)] transition duration-300 sm:flex-row sm:gap-6 sm:rounded-[28px] sm:p-6 sm:text-left ${theme.card} ${canOpen ? "cursor-pointer" : "cursor-default"} ${isSelected ? theme.cardSelected : ""} ${isDimmed ? theme.cardDim : "opacity-100"}`}
                >
                  <img
                    src={member.imgSrc || "https://via.placeholder.com/150"}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded-full border-4 border-current/20 object-cover sm:h-24 sm:w-24"
                    loading="lazy"
                  />

                  <div className="min-w-0">
                    <h2 className={`truncate text-lg font-black uppercase tracking-tight sm:text-xl ${theme.name}`}>
                      {member.name}
                    </h2>
                    <p className={`mt-1 text-[11px] font-black uppercase tracking-[0.18em] sm:text-xs ${theme.role}`}>
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
                  <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${theme.modalLabel}`}>
                    {selected.isLoading
                      ? t("jury.loading")
                      : t("jury.jury_profile_label", "Profil jury")}
                  </p>
                  <h3
                    className={`mt-2 text-xl font-black uppercase tracking-tight sm:text-3xl ${theme.modalTitle}`}
                    dangerouslySetInnerHTML={{
                      __html: normalizeRtlInlineHtml(selected.title.rendered, { isArabic }),
                    }}
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
                  className={`text-[11px] font-black uppercase tracking-[0.2em] transition hover:opacity-80 ${theme.modalLabel}`}
                >
                  {t("jury.close_profile", "Fermer le profil")}
                </button>
              </div>
            </article>
          </div>
        )}

        <style>{`
          .jury-title-inline {
            display: inline-flex;
            flex-direction: row-reverse;
            align-items: baseline;
            gap: 0.45rem;
          }
          .jury-title-prefix,
          .jury-title-rest,
          .jury-ltr-token {
            unicode-bidi: isolate;
          }
          .jury-title-prefix {
            direction: ltr;
          }
          .jury-title-rest {
            direction: rtl;
          }
        `}</style>
      </main>
    </>
  );
}

