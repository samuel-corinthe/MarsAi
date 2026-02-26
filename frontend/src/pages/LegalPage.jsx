import { useEffect, useMemo } from "react";
import Seo from "../components/Seo";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const VARIANTS = {
  cgv: {
    badge: "bg-cyan-500/10 border-cyan-500/30",
    badgeDot: "bg-cyan-400",
    badgeText: "text-cyan-400",
    orb: "from-cyan-500/20 to-purple-600/20",
    buttonClass:
      "px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-cyan-500/50 transition-all duration-300",
    linkHover: "hover:text-cyan-400",
    sectionGradients: [
      "from-cyan-500 to-blue-600",
      "from-purple-500 to-pink-600",
      "from-pink-500 to-red-600",
      "from-orange-500 to-yellow-600",
      "from-green-500 to-emerald-600",
      "from-blue-500 to-indigo-600",
    ],
    accentColors: [
      "#22d3ee",
      "#a78bfa",
      "#f472b6",
      "#fb923c",
      "#34d399",
      "#60a5fa",
    ],
    otherLink: { path: "/cgu", labelKey: "legal.viewCgu" },
  },
  cgu: {
    badge: "bg-purple-500/10 border-purple-500/30",
    badgeDot: "bg-purple-400",
    badgeText: "text-purple-400",
    orb: "from-purple-500/20 to-pink-600/20",
    buttonClass:
      "px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-purple-500/50 transition-all duration-300",
    linkHover: "hover:text-purple-400",
    sectionGradients: [
      "from-cyan-500 to-blue-600",
      "from-purple-500 to-pink-600",
      "from-pink-500 to-red-600",
      "from-orange-500 to-yellow-600",
      "from-green-500 to-emerald-600",
      "from-blue-500 to-indigo-600",
      "from-indigo-500 to-violet-600",
      "from-red-500 to-rose-600",
    ],
    accentColors: [
      "#22d3ee",
      "#a78bfa",
      "#f472b6",
      "#fb923c",
      "#34d399",
      "#60a5fa",
      "#818cf8",
      "#f43f5e",
    ],
    otherLink: { path: "/cgv", labelKey: "legal.viewCgv" },
  },
  mentions: {
    badge: "bg-amber-500/10 border-amber-500/30",
    badgeDot: "bg-amber-400",
    badgeText: "text-amber-400",
    orb: "from-amber-500/20 to-orange-600/20",
    buttonClass:
      "px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-full hover:shadow-lg hover:shadow-amber-500/50 transition-all duration-300",
    linkHover: "hover:text-amber-400",
    sectionGradients: [
      "from-amber-500 to-orange-600",
      "from-purple-500 to-pink-600",
      "from-cyan-500 to-blue-600",
      "from-emerald-500 to-teal-600",
      "from-indigo-500 to-violet-600",
      "from-rose-500 to-red-600",
    ],
    accentColors: [
      "#fbbf24",
      "#a78bfa",
      "#22d3ee",
      "#34d399",
      "#818cf8",
      "#f43f5e",
    ],
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
      if (text) {
        current.content += `<p>${text}</p>`;
      }
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

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [variant]);

  const sections = useMemo(
    () => parseSections(page?.content?.rendered),
    [page?.content?.rendered],
  );
  const locale = i18n.language === "fr" ? "fr-FR" : "en-GB";
  const lastUpdated = formatDate(page?.modified || page?.date, locale);
  const homePath = i18n.language === "en" ? "/home" : "/accueil";
  const localizedRouteMap = {
    "/cgu": "/gcu",
    "/cgv": "/tos",
    "/mentions-legales": "/legal-notice",
    "/agenda": "/schedule",
    "/jury": "/jury-eng",
  };
  const otherLinkPath =
    i18n.language === "en"
      ? localizedRouteMap[config.otherLink.path] || config.otherLink.path
      : config.otherLink.path;

  return (
    <>
      <Seo
        title={page?.title?.rendered || "Mentions legales"}
        description={page?.excerpt?.rendered || page?.content?.rendered}
      />
      <div className="min-h-screen bg-black text-white">
        <div className="relative overflow-hidden bg-gradient-to-br from-black via-gray-900 to-black border-b border-gray-800">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0icmdiYSgyNTUsMjU1LDI1NSwwLjAzKSIgc3Ryb2tlLXdpZHRoPSIxIi8+PC9wYXR0ZXJuPjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2dyaWQpIi8+PC9zdmc+')] opacity-30"></div>

          <div className="relative max-w-6xl mx-auto px-6 py-24">
            <div className="space-y-6">
              <div className="inline-block">
                <div
                  className={`flex items-center space-x-3 px-5 py-2 border rounded-full backdrop-blur-sm ${config.badge}`}
                >
                  <div
                    className={`w-2 h-2 rounded-full animate-pulse ${config.badgeDot}`}
                  ></div>
                  <span
                    className={`text-sm font-medium tracking-wider ${config.badgeText}`}
                    style={{ fontFamily: "'Space Mono', monospace" }}
                  >
                    {t("legal.badge")}
                  </span>
                </div>
              </div>

              <h1
                className="text-6xl md:text-8xl font-black text-transparent bg-gradient-to-r from-white via-gray-300 to-gray-500 bg-clip-text leading-tight"
                style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                dangerouslySetInnerHTML={{
                  __html: page?.title?.rendered || t("legal.defaultTitle"),
                }}
              />

              <p
                className="text-xl text-gray-400 max-w-2xl leading-relaxed"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {lastUpdated
                  ? t("legal.lastUpdated", { date: lastUpdated })
                  : ""}
              </p>
            </div>
          </div>

          <div
            className={`absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br ${config.orb} rounded-full blur-3xl`}
          ></div>
        </div>

        <div className="max-w-4xl mx-auto px-6 py-16">
          <div className="space-y-12">
            {sections.map((section, index) => {
              const gradient =
                config.sectionGradients[index % config.sectionGradients.length];
              const accent =
                config.accentColors[index % config.accentColors.length];
              const isLast = index === sections.length - 1;

              return (
                <section
                  key={`${section.title}-${index}`}
                  className={`space-y-6 pb-12 ${isLast ? "" : "border-b border-gray-800"}`}
                  style={{ "--accent-color": accent }}
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center`}
                    >
                      <span
                        className="text-xl font-bold"
                        style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                      >
                        {index + 1}
                      </span>
                    </div>
                    <h2
                      className="text-3xl font-bold text-white"
                      style={{ fontFamily: "'Bebas Neue', sans-serif" }}
                    >
                      {section.title}
                    </h2>
                  </div>
                  <div
                    className="pl-16 text-gray-300 leading-relaxed legal-content"
                    style={{ fontFamily: "'Inter', sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: section.content }}
                  />
                </section>
              );
            })}
          </div>

          <div className="mt-16 pt-8 border-t border-gray-800">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <Link
                to={homePath}
                className={`flex items-center space-x-2 text-gray-400 transition-colors duration-300 ${config.linkHover}`}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 19l-7-7m0 0l7-7m-7 7h18"
                  />
                </svg>
                <span>{t("legal.backHome")}</span>
              </Link>

              <Link
                to={otherLinkPath}
                className={config.buttonClass}
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                {t(config.otherLink.labelKey)}
              </Link>
            </div>
          </div>
        </div>

        <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700&family=Space+Mono:wght@400;700&display=swap');

        .legal-content > * + * {
          margin-top: 1rem;
        }
        .legal-content ul {
          list-style: none;
          margin-left: 1.5rem;
          padding-left: 0;
        }
        .legal-content li {
          position: relative;
          padding-left: 1.25rem;
        }
        .legal-content li::before {
          content: "\\2022";
          position: absolute;
          left: 0;
          color: var(--accent-color);
        }
      `}</style>
      </div>
    </>
  );
}
