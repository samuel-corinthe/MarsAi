import { Link, useParams } from "react-router-dom";

export default function FilmDetails() {
  const { slug } = useParams();

  return (
    <main className="app-container page">
      <section className="card card-pad">
        <p className="text-sm font-semibold text-emerald-600">Détail vidéo</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-semibold tracking-tight">
          Page en construction
        </h1>
        <p className="mt-4 text-slate-600">
          Tu as demandé la vidéo&nbsp;: <span className="font-semibold">{slug}</span>
        </p>
        <div className="mt-6 flex gap-3">
          <Link className="btn-primary" to="/dashboard">Retour dashboard</Link>
          <Link className="btn-ghost" to="/">Accueil</Link>
        </div>
      </section>
    </main>
  );
}
