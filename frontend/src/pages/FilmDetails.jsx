import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";

export default function FilmDetails() {
  const { slug } = useParams();
  const { i18n } = useTranslation();
  const homePath = i18n.language === "en" ? "/home" : "/accueil";

  return (
    <>
      <Seo title={`Film ${slug}`} description="Page de detail film en construction." />
      <main className="app-container page">
        <section className="card card-pad">
          <p className="text-sm font-semibold text-emerald-600">Detail video</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
            Page en construction
          </h1>
          <p className="mt-4 text-slate-600">
            Tu as demande la video&nbsp;:{" "}
            <span className="font-semibold">{slug}</span>
          </p>
          <div className="mt-6 flnex gap-3">
            <Link className="btn-primary" to="/dashboard">
              Retour dashboard
            </Link>
            <Link className="btn-ghost" to={homePath}>
              Accueil
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
