import { useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { useTheme } from "../context/ThemeContext";
import { getLocalizedPath, normalizeLanguage } from "../utils/localizedRoutes";

const VARIANTS = {
  cgv: {
    badge: "bg-cyan-400/12 border-cyan-300/40",
    badgeDot: "bg-cyan-300",
    badgeText: "text-cyan-100",
    orb: "from-cyan-400/20 to-sky-500/10",
    buttonClass:
      "px-6 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-black uppercase tracking-[0.08em] hover:brightness-105 transition-all duration-200 shadow-[0_10px_26px_rgba(56,189,248,0.35)]",
    linkHover: "hover:text-cyan-200",
    sectionGradients: [
      "from-cyan-400 to-sky-500",
      "from-sky-500 to-indigo-500",
      "from-indigo-500 to-blue-600",
      "from-blue-500 to-cyan-500",
      "from-teal-500 to-cyan-500",
      "from-cyan-500 to-blue-600",
    ],
    accentColors: ["#67e8f9", "#7dd3fc", "#a5b4fc", "#93c5fd", "#5eead4", "#38bdf8"],
    otherLink: { path: "/cgu", labelKey: "legal.viewCgu" },
  },
  cgu: {
    badge: "bg-indigo-400/12 border-indigo-300/40",
    badgeDot: "bg-indigo-300",
    badgeText: "text-indigo-100",
    orb: "from-indigo-400/20 to-violet-500/10",
    buttonClass:
      "px-6 py-3 rounded-full bg-gradient-to-r from-indigo-400 to-violet-500 text-white font-black uppercase tracking-[0.08em] hover:brightness-105 transition-all duration-200 shadow-[0_10px_26px_rgba(129,140,248,0.35)]",
    linkHover: "hover:text-indigo-200",
    sectionGradients: [
      "from-cyan-400 to-sky-500",
      "from-indigo-400 to-violet-500",
      "from-violet-500 to-blue-600",
      "from-blue-500 to-cyan-500",
      "from-teal-500 to-blue-500",
      "from-indigo-500 to-blue-600",
      "from-blue-500 to-indigo-600",
      "from-violet-500 to-indigo-600",
    ],
    accentColors: ["#67e8f9", "#a5b4fc", "#c4b5fd", "#93c5fd", "#5eead4", "#818cf8", "#93c5fd", "#c4b5fd"],
    otherLink: { path: "/cgv", labelKey: "legal.viewCgv" },
  },
  mentions: {
    badge: "bg-amber-400/12 border-amber-300/45",
    badgeDot: "bg-amber-300",
    badgeText: "text-amber-100",
    orb: "from-amber-400/18 to-orange-500/12",
    buttonClass:
      "px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 font-black uppercase tracking-[0.08em] hover:brightness-105 transition-all duration-200 shadow-[0_10px_26px_rgba(251,191,36,0.35)]",
    linkHover: "hover:text-amber-200",
    sectionGradients: [
      "from-amber-400 to-orange-500",
      "from-sky-500 to-indigo-500",
      "from-cyan-500 to-blue-600",
      "from-teal-500 to-cyan-500",
      "from-indigo-500 to-violet-500",
      "from-orange-500 to-amber-500",
    ],
    accentColors: ["#fcd34d", "#7dd3fc", "#67e8f9", "#5eead4", "#a5b4fc", "#fbbf24"],
    otherLink: { path: "/cgu", labelKey: "legal.viewCgu" },
  },
};

const normalizeText = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

const containsArabicText = (value = "") => /[\u0600-\u06FF]/.test(String(value || ""));

const isLastUpdatedText = (value = "") => {
  const text = normalizeText(value);
  const normalizedLatin = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  return (
    text.startsWith("آخر تحديث") ||
    normalizedLatin.startsWith("last updated") ||
    normalizedLatin.startsWith("updated on") ||
    normalizedLatin.startsWith("derniere mise a jour") ||
    normalizedLatin.startsWith("mise a jour")
  );
};

const isNumericToken = (value = "") => {
  const text = normalizeText(value);
  if (!text) return true;
  return /^[\d\u0660-\u0669\u06F0-\u06F9().\-:،\s]+$/.test(text);
};

const sanitizeSectionTitle = (rawTitle = "", fallback = "Section", { isArabic = false } = {}) => {
  let title = normalizeText(rawTitle);
  if (!title) return fallback;

  // Fix patterns like "(Cookies)6. ..." then strip duplicate numeric prefixes.
  title = title.replace(/^\s*\(([^)]+)\)\s*[\d\u0660-\u0669\u06F0-\u06F9]+\s*[.)\-:،]?\s*/u, "($1) ");
  title = title.replace(/^\s*([\d\u0660-\u0669\u06F0-\u06F9]+)\s+\1\s*[.)\-:،]?\s*/u, "");
  title = title.replace(/^\s*[\d\u0660-\u0669\u06F0-\u06F9]+\s*[.)\-:،]?\s*/u, "");

  if (isArabic) {
    title = title.replace(/^\(\s*([A-Za-z0-9./-]+)\s*\)\s*(.+)$/u, (_, token, rest) => {
      const safeRest = normalizeText(rest);
      return containsArabicText(safeRest) ? `${safeRest} (${token})` : `(${token}) ${safeRest}`;
    });
  }

  return normalizeText(title) || fallback;
};

const nodeToHtml = (node) => {
  if (!node) return "";
  if (node.nodeType === 3) {
    const text = normalizeText(node.textContent || "");
    return text ? `<p>${text}</p>` : "";
  }
  if (node.nodeType === 1) {
    return node.outerHTML || "";
  }
  return "";
};

const isLikelyStandaloneSectionTitle = (value = "", { isArabic = false } = {}) => {
  const text = normalizeText(value);
  if (!text || text.length > 120) return false;
  if (/[.!?؟]/.test(text)) return false;
  if (/<|>/.test(text)) return false;
  return isArabic ? containsArabicText(text) : true;
};

const escapeHtml = (value = "") =>
  String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const RTL_SAFE_PATTERNS = [
  /https?:\/\/[^\s<>"')]+/gi,
  /[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/g,
  /\b(?:SIRET|GDPR|IP|Cookies|CGU|CGV|OVH|Hostinger)\b/g,
  /\b\d+(?:[./:-]\d+)*(?:\/\d+)?\b/g,
];

const isPlainLatinLinkText = (value = "") => /^(https?:\/\/|www\.|[\w.+-]+@)/i.test(normalizeText(value));

const normalizeArabicLegalText = (value = "") => {
  let text = String(value || "");

  text = text.replace(/^\(\s*([A-Za-z0-9./-]+)\s*\)\s*(.+)$/u, (_, token, rest) => {
    const safeRest = normalizeText(rest);
    return containsArabicText(safeRest) ? `${safeRest} (${token})` : `(${token}) ${safeRest}`;
  });
  text = text.replace(
    /(?:\[[^\]]+\]\s*:?\s*)?\(?\s*SIRET\s*\)?\s*(رقم(?:\s+[^\s:()]+){0,4})/giu,
    "$1 (SIRET)",
  );
  text = text.replace(
    /(رقم(?:\s+[^\s:()]+){0,4})\s*[:：]?\s*\(?\s*SIRET\s*\)?/giu,
    "$1 (SIRET)",
  );

  return text;
};

const toRtlSafeTextHtml = (value = "") => {
  const text = normalizeArabicLegalText(value);
  if (!text) return "";

  const matches = [];
  RTL_SAFE_PATTERNS.forEach((pattern) => {
    pattern.lastIndex = 0;
    let match = pattern.exec(text);
    while (match) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        value: match[0],
      });
      match = pattern.exec(text);
    }
  });

  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  const merged = [];
  matches.forEach((match) => {
    const previous = merged[merged.length - 1];
    if (previous && match.start < previous.end) return;
    merged.push(match);
  });

  if (!merged.length) return escapeHtml(text);

  let cursor = 0;
  let html = "";

  merged.forEach((match) => {
    if (match.start > cursor) {
      html += escapeHtml(text.slice(cursor, match.start));
    }
    html += `&lrm;<bdo class="legal-ltr-token" dir="ltr">${escapeHtml(match.value)}</bdo>&lrm;`;
    cursor = match.end;
  });

  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor));
  }

  return html;
};

const normalizeLegalContentHtml = (html, { isArabic = false } = {}) => {
  if (!html || typeof window === "undefined" || !isArabic) return html;

  const doc = new DOMParser().parseFromString(`<div>${html}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return html;

  const textNodes = [];
  const collectTextNodes = (node) => {
    Array.from(node.childNodes || []).forEach((child) => {
      if (child.nodeType === 3) {
        if (normalizeText(child.textContent || "")) textNodes.push(child);
        return;
      }
      if (child.nodeType === 1) {
        if (/^a$/i.test(child.tagName || "")) return;
        collectTextNodes(child);
      }
    });
  };

  collectTextNodes(root);

  textNodes.forEach((textNode) => {
    const replacementHtml = toRtlSafeTextHtml(textNode.textContent || "");
    if (!replacementHtml) return;

    const wrapper = doc.createElement("span");
    wrapper.innerHTML = replacementHtml;
    const fragment = doc.createDocumentFragment();
    while (wrapper.firstChild) {
      fragment.appendChild(wrapper.firstChild);
    }
    textNode.parentNode?.replaceChild(fragment, textNode);
  });

  root.querySelectorAll("a").forEach((link) => {
    link.setAttribute("dir", "ltr");
    const linkText = normalizeText(link.textContent || "");
    if (isPlainLatinLinkText(linkText)) {
      link.innerHTML = `&lrm;<bdo class="legal-ltr-token" dir="ltr">${escapeHtml(linkText)}</bdo>&lrm;`;
    }
  });

  return root.innerHTML;
};

const parseSections = (html, { isArabic = false } = {}) => {
  if (!html || typeof window === "undefined") return [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.childNodes).filter((node) => {
    if (node.nodeType === 3) return normalizeText(node.textContent || "").length > 0;
    if (node.nodeType === 1) return true;
    return false;
  });

  const hasHeadings = nodes.some(
    (node) => node.nodeType === 1 && /^h[1-6]$/i.test(node.tagName || ""),
  );

  const sections = [];
  let current = null;
  let pendingSectionNumber = false;

  const closeCurrentSection = () => {
    if (!current) return;
    if (normalizeText(current.title) || normalizeText(current.content)) {
      sections.push({
        ...current,
        content: normalizeLegalContentHtml(current.content, { isArabic }),
      });
    }
    current = null;
    pendingSectionNumber = false;
  };

  const ensureCurrentSection = (title = isArabic ? "مقدمة" : "Introduction") => {
    if (!current) {
      current = { title: sanitizeSectionTitle(title, title, { isArabic }), content: "" };
    }
  };

  nodes.forEach((node) => {
    const nodeText = normalizeText(node.textContent || "");
    if (!nodeText) return;

    if (!current && sections.length === 0 && isLastUpdatedText(nodeText)) {
      pendingSectionNumber = false;
      return;
    }

    const isHeading = node.nodeType === 1 && /^h[1-6]$/i.test(node.tagName || "");
    if (isHeading) {
      closeCurrentSection();
      current = {
        title: sanitizeSectionTitle(
          node.textContent || "",
          isArabic ? "قسم" : "Section",
          { isArabic },
        ),
        content: "",
      };
      return;
    }

    // Remove orphan numbering blocks that create duplicates like "1" + "1. Title".
    if (isNumericToken(nodeText)) {
      pendingSectionNumber = true;
      return;
    }

    if (
      !hasHeadings &&
      pendingSectionNumber &&
      isLikelyStandaloneSectionTitle(nodeText, { isArabic })
    ) {
      closeCurrentSection();
      current = {
        title: sanitizeSectionTitle(
          nodeText,
          isArabic ? "قسم" : "Section",
          { isArabic },
        ),
        content: "",
      };
      pendingSectionNumber = false;
      return;
    }

    ensureCurrentSection(isArabic ? "مقدمة" : "Introduction");

    current.content += nodeToHtml(node);
    pendingSectionNumber = false;
  });

  closeCurrentSection();
  return sections;
};

const formatDate = (value, locale) => {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(locale, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "";
  }
};

export default function LegalPage({ page, variant = "cgv" }) {
  const config = VARIANTS[variant] || VARIANTS.cgv;
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
  const currentLanguage = normalizeLanguage(i18n.language);
  const isArabic = currentLanguage === "ar";

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [variant]);

  const sections = useMemo(
    () => parseSections(page?.content?.rendered, { isArabic }),
    [isArabic, page?.content?.rendered],
  );

  const locale = currentLanguage === "fr" ? "fr-FR" : currentLanguage === "ar" ? "ar" : "en-GB";
  const lastUpdated = formatDate(page?.modified || page?.date, locale);
  const homePath = getLocalizedPath("home", i18n.language);
  const otherLinkKey = config.otherLink.path === "/cgu"
    ? "cgu"
    : config.otherLink.path === "/cgv"
      ? "cgv"
      : "legal";
  const otherLinkPath = getLocalizedPath(otherLinkKey, i18n.language);
  const theme = isLight
    ? {
      page: "bg-gradient-to-b from-[#dbe9ff] via-[#d4e5ff] to-[#eaf4ff] text-slate-900",
      heroBorder: "border-cyan-200/80",
      heroBg: "from-[#dbe9ff] via-[#d4e5ff] to-[#eaf4ff]",
      grid: "opacity-35 [background-image:linear-gradient(rgba(14,116,144,0.18)_1px,transparent_1px),linear-gradient(90deg,rgba(14,116,144,0.18)_1px,transparent_1px)] [background-size:42px_42px]",
      titleGradient: "from-slate-950 via-slate-800 to-cyan-700",
      subtitle: "text-slate-700",
      sectionBorder: "border-cyan-200/75",
      sectionTitle: "text-slate-950",
      sectionText: "text-slate-700",
      footerBorder: "border-cyan-200/75",
      backLink: "text-slate-700 hover:text-cyan-700",
      altButton:
        "px-6 py-3 rounded-full bg-gradient-to-r from-cyan-400 to-sky-500 text-slate-950 font-black uppercase tracking-[0.08em] hover:brightness-105 transition-all duration-200 shadow-[0_10px_26px_rgba(14,165,233,0.3)]",
      linkColor: "#0e7490",
      strongColor: "#031128",
      bulletColorFallback: "#06b6d4",
    }
    : {
      page: "bg-[#020617] text-slate-100",
      heroBorder: "border-slate-700/70",
      heroBg: "from-[#020617] via-[#0b1732] to-[#111827]",
      grid: "opacity-25 [background-image:linear-gradient(rgba(148,163,184,0.12)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.12)_1px,transparent_1px)] [background-size:42px_42px]",
      titleGradient: "from-white via-slate-200 to-slate-400",
      subtitle: "text-slate-300",
      sectionBorder: "border-slate-700/65",
      sectionTitle: "text-white",
      sectionText: "text-slate-300",
      footerBorder: "border-slate-700/65",
      backLink: `text-slate-300 ${config.linkHover}`,
      altButton: config.buttonClass,
      linkColor: "#67e8f9",
      strongColor: "#f8fafc",
      bulletColorFallback: "#67e8f9",
    };

  const badgeTheme = isLight
    ? (variant === "cgu"
      ? {
        badge: "bg-indigo-100 border-indigo-300/80",
        badgeDot: "bg-indigo-500",
        badgeText: "text-indigo-900",
      }
      : variant === "mentions"
        ? {
          badge: "bg-amber-100 border-amber-300/85",
          badgeDot: "bg-amber-500",
          badgeText: "text-amber-900",
        }
        : {
          badge: "bg-cyan-100 border-cyan-300/85",
          badgeDot: "bg-cyan-500",
          badgeText: "text-cyan-900",
        })
    : {
      badge: config.badge,
      badgeDot: config.badgeDot,
      badgeText: config.badgeText,
    };

  return (
    <>
      <Seo
        title={page?.title?.rendered || "Mentions legales"}
        description={page?.excerpt?.rendered || page?.content?.rendered}
      />

      <main className={`min-h-screen ${theme.page}`} dir={isArabic ? "rtl" : "ltr"}>
        <div className={`relative overflow-hidden border-b bg-gradient-to-br ${theme.heroBorder} ${theme.heroBg}`}>
          <div className={`absolute inset-0 ${theme.grid}`} />

          <div className="relative mx-auto max-w-6xl px-6 py-20 md:py-24">
            <div className="space-y-5">
              <div className="inline-block">
                <div className={`inline-flex items-center gap-3 rounded-full border px-4 py-2 backdrop-blur-sm ${badgeTheme.badge}`}>
                  <span className={`h-2 w-2 rounded-full animate-pulse ${badgeTheme.badgeDot}`} />
                  <span className={`text-xs font-black uppercase tracking-[0.18em] ${badgeTheme.badgeText}`}>
                    {t("legal.badge")}
                  </span>
                </div>
              </div>

              <h1
                className={`text-5xl font-black uppercase leading-[0.95] tracking-tight text-transparent bg-gradient-to-r bg-clip-text md:text-7xl ${theme.titleGradient}`}
                dangerouslySetInnerHTML={{ __html: page?.title?.rendered || t("legal.defaultTitle") }}
              />

              <p className={`max-w-2xl text-sm leading-relaxed md:text-base ${theme.subtitle}`}>
                {lastUpdated ? t("legal.lastUpdated", { date: lastUpdated }) : ""}
              </p>
            </div>
          </div>

          <div className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-gradient-to-br blur-3xl ${config.orb}`} />
        </div>

        <div className="mx-auto max-w-4xl px-6 py-14 md:py-16">
          <div className="space-y-10">
            {sections.map((section, index) => {
              const gradient = config.sectionGradients[index % config.sectionGradients.length];
              const accent = config.accentColors[index % config.accentColors.length];
              const isLast = index === sections.length - 1;

              return (
                <section
                  key={`${section.title}-${index}`}
                  className={`space-y-5 pb-10 ${isLast ? "" : `border-b ${theme.sectionBorder}`}`}
                  style={{ "--accent-color": accent }}
                >
                  <div className="flex items-center gap-4">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br ${gradient} shadow-[0_10px_22px_rgba(2,6,23,0.4)]`}>
                      <span className="text-lg font-black text-slate-950">{index + 1}</span>
                    </div>
                    <h2 className={`text-2xl font-black uppercase tracking-tight md:text-3xl ${theme.sectionTitle}`}>
                      {section.title}
                    </h2>
                  </div>

                  <div
                    className={`legal-content pl-0 text-sm leading-relaxed md:pl-14 md:text-base ${theme.sectionText}`}
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </section>
              );
            })}
          </div>

          <div className={`mt-12 border-t pt-6 ${theme.footerBorder}`}>
            <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
              <Link
                to={homePath}
                className={`inline-flex items-center gap-2 text-sm font-semibold transition-colors ${theme.backLink}`}
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>{t("legal.backHome")}</span>
              </Link>

              <Link to={otherLinkPath} className={theme.altButton}>
                {t(config.otherLink.labelKey)}
              </Link>
            </div>
          </div>
        </div>

        <style>{`
          .legal-content > * + * {
            margin-top: 0.9rem;
          }
          .legal-content ul {
            list-style: none;
            margin-left: 1.2rem;
            padding-left: 0;
          }
          .legal-content li {
            position: relative;
            padding-left: 1.15rem;
          }
          .legal-content li::before {
            content: "\\2022";
            position: absolute;
            left: 0;
            color: var(--accent-color, ${theme.bulletColorFallback});
          }
          [dir="rtl"] .legal-content ul {
            margin-right: 1.2rem;
            margin-left: 0;
          }
          [dir="rtl"] .legal-content li {
            padding-right: 1.15rem;
            padding-left: 0;
          }
          [dir="rtl"] .legal-content li::before {
            right: 0;
            left: auto;
          }
          .legal-content a {
            color: ${theme.linkColor};
            text-decoration: underline;
            text-underline-offset: 3px;
          }
          .legal-content .legal-ltr-token,
          .legal-content a[dir="ltr"] {
            direction: ltr;
            unicode-bidi: isolate;
            max-width: 100%;
            text-align: left;
            overflow-wrap: anywhere;
            word-break: break-word;
          }
          .legal-content strong {
            color: ${theme.strongColor};
          }
        `}</style>
      </main>
    </>
  );
}
