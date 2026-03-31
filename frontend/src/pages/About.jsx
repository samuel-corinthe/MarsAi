import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { OrganizationSchema, WebSiteSchema } from "../components/Schema";
import { getPageBySlug } from "../api";
import PageLoader from "../components/ui/PageLoader";
import { useTheme } from "../context/ThemeContext";
import { getLocalizedPath, normalizeLanguage } from "../utils/localizedRoutes";
import { resolvePublicAssetPath } from "../utils/assetUrl";

function containsArabicText(value = "") {
  return /[\u0600-\u06FF]/.test(String(value || ""));
}

function normalizeTextToken(value = "") {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

function sanitizeAboutContentHtml(contentHtml = "") {
  if (!contentHtml || typeof window === "undefined") return contentHtml;

  const doc = new DOMParser().parseFromString(contentHtml, "text/html");
  const textBlocks = Array.from(
    doc.body.querySelectorAll("h1, h2, h3, h4, h5, h6, p, strong"),
  ).filter((node) => node.textContent && node.textContent.trim().length > 0);

  const firstBlock = textBlocks[0];
  if (firstBlock && normalizeTextToken(firstBlock.textContent) === "marsai") {
    firstBlock.remove();
  }

  return doc.body.innerHTML.trim();
}

export default function About() {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
  const [wpContent, setWpContent] = useState(null);
  const [loading, setLoading] = useState(true);
  const currentLanguage = normalizeLanguage(i18n.language);
  const isArabic = currentLanguage === "ar";

  const submitFilmPath = getLocalizedPath("submitFilm", i18n.language);
  const contactPath = getLocalizedPath("contact", i18n.language);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const candidates = currentLanguage === "fr"
          ? [{ slug: "a-propos", lang: "fr" }]
          : currentLanguage === "en"
            ? [{ slug: "about", lang: "en" }]
            : [
              { slug: "حول", lang: "ar" },
              { slug: "about-ar", lang: "ar" },
              { slug: "about", lang: "ar" },
              { slug: "a-propos", lang: "ar" },
            ];
        let data = null;

        for (const candidate of candidates) {
          const candidateData = await getPageBySlug(candidate.slug, candidate.lang);
          if (!candidateData) continue;

          const candidateLooksArabic =
            normalizeLanguage(candidateData.lang || candidate.lang) === "ar" ||
            containsArabicText(candidateData?.title?.rendered) ||
            containsArabicText(candidateData?.content?.rendered);

          if (currentLanguage !== "ar" || candidateLooksArabic) {
            data = candidateData;
            break;
          }
        }

        if (!cancelled) setWpContent(data);
      } catch {
        if (!cancelled) setWpContent(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [currentLanguage, i18n.language]);

  if (loading) {
    return <PageLoader message={t("about.loading", "Chargement...")} />;
  }

  const hasLocalizedWpContent = currentLanguage !== "ar" ||
    containsArabicText(wpContent?.title?.rendered) ||
    containsArabicText(wpContent?.content?.rendered);
  const wpTitle = hasLocalizedWpContent ? wpContent?.title?.rendered : "";
  const wpContentHtml = hasLocalizedWpContent
    ? sanitizeAboutContentHtml(wpContent?.content?.rendered || "")
    : "";
  const wpExcerpt = hasLocalizedWpContent ? wpContent?.excerpt?.rendered : "";
  const heroDescription = t("about.description");
  const shouldShowHeroDescription = !wpContentHtml;
  const seoTitle = wpTitle || t("about.defaultTitle") || "A propos";
  const seoDescription =
    wpExcerpt || wpContentHtml || heroDescription;
  const theme = isLight
    ? {
      page: "bg-gradient-to-b from-[#dbe9ff] via-[#d4e5ff] to-[#eaf4ff] text-slate-900",
      kicker: "border-cyan-300/65 bg-cyan-100/80 text-cyan-800",
      title: "text-slate-950",
      subtitle: "text-slate-700",
      primaryBtn: "from-cyan-300 to-sky-400 text-slate-950",
      secondaryBtn:
        "border-cyan-200/80 bg-[#f7fbff]/90 text-slate-700 hover:border-cyan-300 hover:text-cyan-700",
      divider: "border-cyan-200/80",
      richtext: "prose-p:text-slate-700 prose-headings:text-slate-950 prose-a:text-cyan-800",
      fallbackText: "text-slate-700",
      imageBorder: "border-cyan-200/80 shadow-[0_16px_40px_rgba(2,23,55,0.16)]",
      featureText: "text-slate-700",
    }
    : {
      page: "bg-gradient-to-b from-[#020617] via-[#0b1732] to-[#020617] text-slate-100",
      kicker: "border-cyan-300/45 bg-cyan-400/10 text-cyan-200",
      title: "text-white",
      subtitle: "text-slate-300",
      primaryBtn: "from-cyan-300 to-sky-400 text-slate-950",
      secondaryBtn:
        "border-slate-400/45 bg-slate-900/40 text-slate-100 hover:border-cyan-300/60 hover:text-cyan-100",
      divider: "border-cyan-300/20",
      richtext: "prose-p:text-slate-300 prose-headings:text-white prose-a:text-cyan-300",
      fallbackText: "text-slate-300",
      imageBorder: "border-slate-500/35 shadow-[0_16px_40px_rgba(2,6,23,0.4)]",
      featureText: "text-slate-300",
    };

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <OrganizationSchema />
      <WebSiteSchema />

      <main
        className={`min-h-screen py-14 md:py-16 ${theme.page}`}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className="site-container space-y-10">
          <section>
            <p className={`inline-flex rounded-full border px-3 py-1 text-[11px] font-black uppercase tracking-[0.2em] ${theme.kicker}`}>
              marsAI
            </p>
            <h1
              className={`mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl md:text-5xl ${theme.title}`}
              dangerouslySetInnerHTML={{
                __html: wpTitle || t("about.defaultTitle"),
              }}
            />
            {shouldShowHeroDescription && (
              <p className={`mt-4 max-w-3xl text-sm leading-relaxed sm:text-base ${theme.subtitle}`}>
                {heroDescription}
              </p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={submitFilmPath}
                className={`inline-flex rounded-full bg-gradient-to-r px-6 py-3 text-sm font-black uppercase tracking-[0.12em] transition hover:brightness-105 ${theme.primaryBtn}`}
              >
                {t("about.cta_join")}
              </Link>
              <Link
                to={contactPath}
                className={`inline-flex rounded-full border px-6 py-3 text-xs font-black uppercase tracking-[0.12em] transition ${theme.secondaryBtn}`}
              >
                {t("about.cta_contact")}
              </Link>
            </div>
          </section>

          <section className={`grid items-start gap-8 border-t pt-8 lg:grid-cols-[1.2fr_1fr] ${theme.divider}`}>
            <article className="min-w-0">
              {wpContentHtml ? (
                <div
                  className={`site-richtext ${theme.richtext}`}
                  dangerouslySetInnerHTML={{ __html: wpContentHtml }}
                />
              ) : (
                <div className={`space-y-4 ${theme.fallbackText}`}>
                  <p>{heroDescription}</p>
                  <p>{t("about.community")}</p>
                </div>
              )}
            </article>

            <aside className="space-y-4">
              <img
                src={resolvePublicAssetPath("/images/marsai-illustration.webp")}
                alt="MarsAI"
                className={`w-full rounded-[28px] border object-cover ${theme.imageBorder}`}
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <p className={`text-sm ${theme.featureText}`}>{t("about.features.future")}</p>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
