import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { getSitePhaseState } from "../api";
import PhaseCountdownBanner from "../components/phases/PhaseCountdownBanner";

export default function CallForProject({ page }) {
  const { t, i18n } = useTranslation();
  const [sitePhase, setSitePhase] = useState(null);
  const [phaseLoaded, setPhaseLoaded] = useState(false);
  const [phaseLoadError, setPhaseLoadError] = useState("");

  const uploadPath = i18n.language === "en" ? "/submit-film" : "/deposer-un-film";

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const payload = await getSitePhaseState();
        if (!cancelled) setSitePhase(payload);
      } catch (error) {
        if (!cancelled) {
          setPhaseLoadError(error?.message || "Impossible de charger l'etat des phases.");
        }
      } finally {
        if (!cancelled) setPhaseLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const currentPhaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
  const isPhase1 = phaseLoaded && Boolean(sitePhase) && currentPhaseKey === "phase_1";
  const seoTitle = page?.title?.rendered || "Appel a projet";
  const seoDescription = page?.excerpt?.rendered || page?.content?.rendered || "";

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <main className="min-h-screen bg-gradient-to-b from-[#020617] via-[#0b1732] to-[#020617] py-14 text-slate-100 md:py-16">
        <div className="site-container space-y-8">
          <section>
            <p className="inline-flex rounded-full border border-cyan-300/45 bg-cyan-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">
              {t("projects.main_title")}
            </p>
            <h1 className="mt-4 text-3xl font-black uppercase tracking-tight text-white sm:text-4xl md:text-5xl">
              {t("projects.main_title")}
            </h1>
            {phaseLoaded && (
              <div className="mt-6">
                <PhaseCountdownBanner sitePhase={sitePhase} language={i18n.language} variant="callForProject" />
              </div>
            )}
            {phaseLoadError && (
              <p className="mt-4 rounded-xl border border-rose-300/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {phaseLoadError}
              </p>
            )}
          </section>

          <section className="border-t border-cyan-300/20 pt-8">
            <div
              className="site-richtext prose-p:text-slate-300 prose-headings:text-white prose-a:text-cyan-300"
              dangerouslySetInnerHTML={{ __html: page?.content?.rendered || "" }}
            />

            {isPhase1 && (
              <div className="mt-8 rounded-2xl border border-emerald-300/30 bg-emerald-500/10 p-5">
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-200">
                  {i18n.language === "en" ? "Call for projects is open" : "Appel a projet ouvert"}
                </p>
                <p className="mt-2 text-sm text-emerald-100/90">
                  {i18n.language === "en"
                    ? "Submit your film directly from the upload form."
                    : "Depose ton film directement depuis le formulaire d'upload."}
                </p>
                <Link
                  to={uploadPath}
                  className="mt-4 inline-flex rounded-full bg-gradient-to-r from-cyan-300 to-sky-400 px-6 py-3 text-xs font-black uppercase tracking-[0.12em] text-slate-950 transition hover:brightness-105"
                >
                  {t("nav.submitFilm")}
                </Link>
              </div>
            )}
          </section>
        </div>
      </main>
    </>
  );
}
