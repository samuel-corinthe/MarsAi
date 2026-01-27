import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <main className="app-container page">
      <div className="card card-pad">
        <h1 className="h1">404</h1>
        <p className="lead mt-2">Cette page n’existe pas.</p>
        <Link className="mt-6 inline-block text-blue-600 underline" to="/">
          Retour à l’accueil
        </Link>
      </div>
    </main>
  );
}
