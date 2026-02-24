import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";

export default function NotFound() {
  const { t, i18n } = useTranslation();
  const homePath = i18n.language === "en" ? "/home" : "/accueil";
  const moviesPath = i18n.language === "en" ? "/movies" : "/films";

  return (
    <>
      <Seo title="Page introuvable" description={t("not_found.description")} noIndex />
      <main className="site-page py-16">
        <div className="site-container">
          <section className="site-panel site-panel-solid mx-auto max-w-3xl text-center">
            <p className="site-kicker mx-auto">404</p>
            <h1 className="mt-4 text-7xl font-black text-cyan-300 sm:text-8xl">PAGE</h1>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white sm:text-4xl">
              {t("not_found.title")}
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-slate-300 sm:text-base">
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
