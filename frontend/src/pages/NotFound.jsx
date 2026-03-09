import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { useTheme } from "../context/ThemeContext";
import { getLocalizedPath, normalizeLanguage } from "../utils/localizedRoutes";

export default function NotFound() {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
  const isArabic = normalizeLanguage(i18n.language) === "ar";
  const homePath = getLocalizedPath("home", i18n.language);
  const moviesPath = getLocalizedPath("films", i18n.language);
  const panelClass = isLight ? "bg-white/92" : "site-panel-solid";
  const titleClass = isLight ? "text-slate-900" : "text-white";
  const textClass = isLight ? "text-slate-600" : "text-slate-300";
  const accentClass = isLight ? "text-sky-600" : "text-cyan-300";

  return (
    <>
      <Seo title={t("not_found.title")} description={t("not_found.description")} noIndex />
      <main className="site-page py-16" dir={isArabic ? "rtl" : "ltr"}>
        <div className="site-container">
          <section className={`site-panel mx-auto max-w-3xl text-center ${panelClass}`}>
            <p className="site-kicker mx-auto">404</p>
            <h1 className={`mt-4 text-7xl font-black sm:text-8xl ${accentClass}`}>PAGE</h1>
            <h2 className={`text-3xl font-black uppercase tracking-tight sm:text-4xl ${titleClass}`}>
              {t("not_found.title")}
            </h2>
            <p className={`mx-auto mt-4 max-w-xl text-sm sm:text-base ${textClass}`}>
              {t("not_found.description")}
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link to={homePath} className="site-btn-primary">
                {t("not_found.back_home")}
              </Link>
              <Link to={moviesPath} className="site-btn-secondary">
                {t("not_found.see_movies")}
              </Link>
            </div>
          </section>
        </div>
      </main>
    </>
  );
}
