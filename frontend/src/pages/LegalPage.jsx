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

const parseSections = (html) => {
  if (!html) return [];

  const doc = new DOMParser().parseFromString(html, "text/html");
  const nodes = Array.from(doc.body.childNodes).filter((node) => {
    if (node.nodeType === 3) {
      return node.textContent && node.textContent.trim().length > 0;
    }
    return true;
  });

  const sections = [];
  let current = null;

  nodes.forEach((node) => {
    if (node.nodeType === 1 && node.tagName.toLowerCase() === "h2") {
      if (current) sections.push(current);
      current = { title: node.textContent.trim(), content: "" };
      return;
    }

    if (!current) {
      current = { title: "Introduction", content: "" };
    }

    if (node.nodeType === 3) {
      const text = node.textContent.trim();
      if (text) current.content += `<p>${text}</p>`;
      return;
    }

    if (node.outerHTML) {
      current.content += node.outerHTML;
    }
  });

  if (current) sections.push(current);
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
    () => parseSections(page?.content?.rendered),
    [page?.content?.rendered],
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
          .legal-content a {
            color: ${theme.linkColor};
            text-decoration: underline;
            text-underline-offset: 3px;
          }
          .legal-content strong {
            color: ${theme.strongColor};
          }
        `}</style>
      </main>
    </>
  );
}
