import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { getPageBySlug } from "../api";
import NotFound from "./NotFound";
import Seo from "../components/Seo";

export default function Partenaires() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        // Logique de slug étendue à l'arabe
        let slug = "partenaires"; // Par défaut en Français

        if (i18n.language.startsWith("en")) {
          slug = "partners";
        } else if (i18n.language.startsWith("ar")) {
          slug = "partners-ar"; // Ou le slug exact que tu as mis sur WP pour l'arabe
        }

        const data = await getPageBySlug(slug);

        if (!cancelled) {
          // Si WordPress ne trouve pas la page arabe, on peut tenter un fallback
          if (!data && i18n.language.startsWith("ar")) {
            const fallbackData = await getPageBySlug("partners"); // Fallback sur l'anglais
            setPage(fallbackData);
          } else {
            setPage(data);
          }
          setLoading(false);
        }
      } catch (error) {
        if (!cancelled) {
          setPage(null);
          setLoading(false);
        }
      }
    })();

    return () => (cancelled = true);
  }, [i18n.language]); // Ecoute les changements de langue

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600 text-lg font-medium">
            {t("partners.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!page) return <NotFound />;

  const seoTitle = page?.title?.rendered || t("nav.partners");
  const seoDescription =
    page?.excerpt?.rendered ||
    page?.content?.rendered ||
    t("partners.subtitle");

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <main className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* En-tête avec titre dynamique (WordPress) et labels traduits */}
        <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-blue-700 py-16 shadow-xl">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="inline-block px-4 py-1 bg-white/20 backdrop-blur-sm rounded-full mb-4">
              <p className="text-sm font-semibold text-white uppercase tracking-wider">
                {t("partners.badge")}
              </p>
            </div>
            <h1
              className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg"
              dangerouslySetInnerHTML={{ __html: page.title.rendered }}
            />
            <p className="mt-4 text-lg text-blue-50 max-w-2xl mx-auto">
              {t("partners.subtitle")}
            </p>
          </div>
        </div>

        {/* Contenu WordPress */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div
              className="px-8 py-12 text-center
                       [&_h2]:text-center [&_h2]:text-gray-500 [&_h2]:text-base [&_h2]:font-bold 
                       [&_h2]:uppercase [&_h2]:tracking-widest [&_h2]:mb-10 [&_h2]:mt-16
                       [&_h2]:relative [&_h2]:pb-3
                       [&_h2]:after:content-[''] [&_h2]:after:absolute [&_h2]:after:bottom-0 
                       [&_h2]:after:left-1/2 [&_h2]:after:-translate-x-1/2 
                       [&_h2]:after:w-24 [&_h2]:after:h-1 [&_h2]:after:bg-blue-500
                       [&_h2:first-child]:mt-0
                       [&_img]:max-w-[180px] [&_img]:h-auto [&_img]:mx-auto [&_img]:mb-8
                       [&_img]:inline-block [&_img]:p-4
                       [&_p]:flex [&_p]:flex-wrap [&_p]:justify-center [&_p]:items-center
                       [&_p]:gap-8 [&_p]:mb-12 [&_p]:text-center
                       [&_a]:inline-block"
              dangerouslySetInnerHTML={{ __html: page.content.rendered }}
            />
          </div>

          {/* Section call-to-action traduite */}
          <div className="mt-16 text-center">
            <div className="bg-gradient-to-r from-blue-500 to-blue-700 rounded-2xl shadow-xl p-10">
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4">
                {t("partners.cta_title")}
              </h3>
              <p className="text-blue-50 text-lg mb-6 max-w-2xl mx-auto">
                {t("partners.cta_text")}
              </p>
              <a
                href="/contact"
                className="inline-block bg-white text-blue-600 font-bold px-8 py-4 rounded-full 
                         hover:bg-blue-50 transition-all duration-300 hover:scale-105 
                         shadow-lg hover:shadow-xl"
              >
                {t("partners.cta_button")} →
              </a>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
