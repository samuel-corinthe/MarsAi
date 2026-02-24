import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { OrganizationSchema, WebSiteSchema } from "../components/Schema";
import { getPageBySlug } from "../api";
import PageLoader from "../components/ui/PageLoader";

export default function About() {
  const { t, i18n } = useTranslation();
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

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <OrganizationSchema />
      <WebSiteSchema />

      <main className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0b1732] to-[#020617] py-14 text-slate-100 md:py-16">
        <div className="site-container space-y-10">
          <section>
            <p className="inline-flex rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              marsAI
            </p>
            <h1
              className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl"
              dangerouslySetInnerHTML={{
                __html: wpContent?.title?.rendered || t("about.defaultTitle"),
              }}
            />
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t("about.description")}
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                to={submitFilmPath}
                className="inline-flex rounded-full bg-gradient-to-r from-cyan-300 to-sky-400 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:brightness-105"
              >
                {t("about.cta_join")}
              </Link>
              <Link
                to={contactPath}
                className="inline-flex rounded-full border border-slate-400/45 bg-slate-900/40 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-100 transition hover:border-cyan-300/60 hover:text-cyan-100"
              >
                {t("about.cta_contact")}
              </Link>
            </div>
          </section>

          <section className="grid items-start gap-8 border-t border-cyan-300/20 pt-8 lg:grid-cols-[1.2fr_1fr]">
            <article className="min-w-0">
              {wpContent?.content?.rendered ? (
                <div
                  className="site-richtext prose-p:text-slate-300 prose-headings:text-white prose-a:text-cyan-300"
                  dangerouslySetInnerHTML={{ __html: wpContent.content.rendered }}
                />
              ) : (
                <div className="space-y-4 text-slate-300">
                  <p>{t("about.description")}</p>
                  <p>{t("about.community")}</p>
                </div>
              )}
            </article>

            <aside className="space-y-4">
              <img
                src="/images/marsai-illustration.png"
                alt="MarsAI"
                className="w-full rounded-[28px] border border-slate-500/35 object-cover shadow-[0_16px_40px_rgba(2,6,23,0.4)]"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
              <p className="text-sm text-slate-300">{t("about.features.future")}</p>
            </aside>
          </section>
        </div>
      </main>
    </>
  );
}
