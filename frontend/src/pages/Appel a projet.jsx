import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { getSitePhaseState } from "../api";
import PhaseCountdownBanner from "../components/phases/PhaseCountdownBanner";
import { useTheme } from "../context/ThemeContext";

export default function CallForProject({ page }) {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
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
  const theme = isLight
    ? {
      page: "bg-gradient-to-b from-[#dbe9ff] via-[#d4e5ff] to-[#eaf4ff] text-slate-900",
      kicker: "border-cyan-300/65 bg-cyan-100/80 text-cyan-800",
      title: "text-slate-950",
      error: "border-rose-300/70 bg-rose-100 text-rose-700",
      divider: "border-cyan-200/80",
      richtext: "prose-p:text-slate-700 prose-headings:text-slate-950 prose-a:text-cyan-800",
      infoBox: "border-emerald-400/40 bg-emerald-100/80",
      infoKicker: "text-emerald-700",
      infoText: "text-emerald-800",
      cta: "from-cyan-300 to-sky-400 text-slate-950",
    }
    : {
      page: "bg-gradient-to-b from-[#020617] via-[#0b1732] to-[#020617] text-slate-100",
      kicker: "border-cyan-300/45 bg-cyan-400/10 text-cyan-200",
      title: "text-white",
      error: "border-rose-300/40 bg-rose-500/10 text-rose-100",
      divider: "border-cyan-300/20",
      richtext: "prose-p:text-slate-300 prose-headings:text-white prose-a:text-cyan-300",
      infoBox: "border-emerald-300/30 bg-emerald-500/10",
      infoKicker: "text-emerald-200",
      infoText: "text-emerald-100/90",
      cta: "from-cyan-300 to-sky-400 text-slate-950",
    };

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <main className={`min-h-screen py-14 md:py-16 ${theme.page}`}>
        <div className="site-container space-y-8">
          <section>
            <p className={`inline-flex rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] ${theme.kicker}`}>
              {t("projects.main_title")}
            </p>
            <h1 className={`mt-4 text-3xl font-black uppercase tracking-tight sm:text-4xl md:text-5xl ${theme.title}`}>
              {t("projects.main_title")}
            </h1>
            {phaseLoaded && (
              <div className="mt-6">
                <PhaseCountdownBanner
                  sitePhase={sitePhase}
                  language={i18n.language}
                  variant="callForProject"
                  isLight={isLight}
                />
              </div>
            )}
            {phaseLoadError && (
              <p className={`mt-4 rounded-xl border px-4 py-3 text-sm ${theme.error}`}>
                {phaseLoadError}
              </p>
            )}
          </section>

          <section className={`border-t pt-8 ${theme.divider}`}>
            <div
              className={`site-richtext ${theme.richtext}`}
              dangerouslySetInnerHTML={{ __html: page?.content?.rendered || "" }}
            />

            {isPhase1 && (
              <div className={`mt-8 rounded-2xl border p-5 ${theme.infoBox}`}>
                <p className={`text-xs font-black uppercase tracking-[0.2em] ${theme.infoKicker}`}>
                  {i18n.language === "en" ? "Call for projects is open" : "Appel a projet ouvert"}
                </p>
                <p className={`mt-2 text-sm ${theme.infoText}`}>
                  {i18n.language === "en"
                    ? "Submit your film directly from the upload form."
                    : "Depose ton film directement depuis le formulaire d'upload."}
                </p>
                <Link
                  to={uploadPath}
                  className={`mt-4 inline-flex rounded-full bg-gradient-to-r px-6 py-3 text-xs font-black uppercase tracking-[0.12em] transition hover:brightness-105 ${theme.cta}`}
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
