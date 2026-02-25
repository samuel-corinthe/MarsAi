import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { OrganizationSchema, WebSiteSchema } from "../components/Schema";
import { getPageBySlug } from "../api";
import PageLoader from "../components/ui/PageLoader";
import { useTheme } from "../context/ThemeContext";

export default function About() {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
  const [wpContent, setWpContent] = useState(null);
  const [loading, setLoading] = useState(true);

  const submitFilmPath = i18n.language === "en" ? "/submit-film" : "/deposer-un-film";
  const contactPath = "/contact";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const slug = i18n.language === "fr" ? "a-propos" : "about";
        const data = await getPageBySlug(slug, i18n.language);
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
  }, [i18n.language]);

  if (loading) {
    return <PageLoader message={t("about.loading", "Chargement...")} />;
  }

  const seoTitle = wpContent?.title?.rendered || t("about.defaultTitle") || "A propos";
  const seoDescription =
    wpContent?.excerpt?.rendered || wpContent?.content?.rendered || t("about.description");
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

      <main className={`min-h-screen py-14 md:py-16 ${theme.page}`}>
        <div className="site-container space-y-10">
          <section>
            <p className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${theme.kicker}`}>
              marsAI
            </p>
            <h1
              className={`mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl md:text-5xl ${theme.title}`}
              dangerouslySetInnerHTML={{
                __html: wpContent?.title?.rendered || t("about.defaultTitle"),
              }}
            />
            <p className={`mt-4 max-w-3xl text-sm leading-relaxed sm:text-base ${theme.subtitle}`}>
              {t("about.description")}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={submitFilmPath}
                className={`inline-flex rounded-full bg-gradient-to-r px-6 py-3 text-xs font-black uppercase tracking-[0.12em] transition hover:brightness-105 ${theme.primaryBtn}`}
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
              {wpContent?.content?.rendered ? (
                <div
                  className={`site-richtext ${theme.richtext}`}
                  dangerouslySetInnerHTML={{ __html: wpContent.content.rendered }}
                />
              ) : (
                <div className={`space-y-4 ${theme.fallbackText}`}>
                  <p>{t("about.description")}</p>
                  <p>{t("about.community")}</p>
                </div>
              )}
            </article>

            <aside className="space-y-4">
              <img
                src="/images/marsai-illustration.png"
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
