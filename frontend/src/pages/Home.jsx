import { Link } from "react-router-dom";

export default function Home() {
  return (
    <main className="app-container page">
      <section className="card card-pad">
        <p className="text-sm font-semibold text-emerald-600">MarsAi</p>
        <h1 className="mt-3 text-4xl md:text-5xl font-semibold tracking-tight">
          Une expérience moderne, pilotée par WordPress headless.
        </h1>
        <p className="mt-4 text-slate-600 md:text-lg">
          Contenu modifiable côté WordPress, interface rapide côté React.
        </p>
        <div className="mt-6 flex gap-3">
          <Link className="btn-primary" to="/page-d-exemple">Découvrir</Link>
          <Link className="btn-ghost" to="/contact">Contact</Link>
        </div>
      </section>
    </main>
  );
}
