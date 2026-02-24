import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { BreadcrumbSchema, ArticleSchema } from "../components/Schema";
import { getPageBySlug } from "../api";
import NotFound from "./NotFound";
import PageLoader from "../components/ui/PageLoader";

export default function Partenaires() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const slug = i18n.language.startsWith("en") ? "partners" : "partenaires";
        const data = await getPageBySlug(slug);
        if (!cancelled) setPage(data);
      } catch {
        if (!cancelled) setPage(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [i18n.language]);

  if (loading) {
    return <PageLoader message={t("partners.loading", "Chargement...")} />;
  }

  if (!page) return <NotFound />;

  const seoTitle = page?.title?.rendered || t("nav.partners", "Partenaires");
  const seoDescription =
    page?.excerpt?.rendered || page?.content?.rendered || t("partners.subtitle");
  const breadcrumbItems = [
    {
      name: i18n.language === "en" ? "Home" : "Accueil",
      url: i18n.language === "en" ? "/home" : "/accueil",
    },
    {
      name: t("nav.partners", "Partenaires"),
      url: i18n.language === "en" ? "/partners" : "/partenaires",
    },
  ];

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <BreadcrumbSchema items={breadcrumbItems} />
      <ArticleSchema
        headline={page?.title?.rendered}
        description={seoDescription}
        datePublished={page?.date}
        dateModified={page?.modified}
      />

      <main className="min-h-screen bg-gradient-to-b from-[#f4f8ff] via-[#eef5ff] to-[#f8fcff] py-14 text-slate-900 md:py-16">
        <div className="site-container">
          <section className="pb-10">
            <p className="inline-flex rounded-full border border-sky-300/60 bg-sky-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-sky-700">
              {t("partners.badge", "Partenaires")}
            </p>
            <h1
              className="mt-4 text-3xl font-black uppercase tracking-tight text-slate-900 sm:text-4xl md:text-5xl"
              dangerouslySetInnerHTML={{ __html: page.title.rendered }}
            />
            <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
              {t("partners.subtitle")}
            </p>
          </section>

          <section className="border-t border-sky-200/80 pt-8">
            <div
              className="prose max-w-none text-center prose-p:text-slate-600 prose-headings:text-slate-900 [&_h2]:text-xs [&_h2]:font-black [&_h2]:uppercase [&_h2]:tracking-[0.25em] [&_h2]:text-sky-700 [&_h2]:mt-12 [&_h2]:mb-6 [&_img]:mx-auto [&_img]:max-h-28 [&_img]:w-auto [&_img]:rounded-xl [&_img]:border [&_img]:border-sky-200/80"
              dangerouslySetInnerHTML={{ __html: page.content.rendered }}
            />
          </section>

          <section className="border-t border-sky-200/80 pt-10">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 sm:text-3xl">
              {t("partners.cta_title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
              {t("partners.cta_text")}
            </p>
            <a
              href="/contact"
              className="mt-5 inline-flex rounded-full bg-gradient-to-r from-cyan-300 to-sky-400 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:brightness-105"
            >
              {t("partners.cta_button")}
            </a>
          </section>
        </div>
      </main>
    </>
  );
}
