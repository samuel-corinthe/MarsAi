import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";
import NotFound from "./NotFound";

export default function WpPage({ isHome = false }) {
  const { slug: routeSlug } = useParams();
  const slug = isHome ? "accueil" : routeSlug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(false);
      try {
        const data = await getPageBySlug(slug);
        if (!cancelled) {
          setPage(data); // peut être null si 404
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setError(true); // erreur réseau/serveur
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (loading) return <div className="app-container page">Chargement…</div>;
  if (error) return <div className="app-container page">Impossible de charger la page pour le moment.</div>;
  if (!page) return <NotFound />; // on n'affiche 404 que si le slug n'existe pas

  return (
    <main className="app-container page">
      <div className="card card-pad">
        <h1
          className="h1"
          dangerouslySetInnerHTML={{ __html: page.title.rendered }}
        />
        <div
          className="richtext mt-6"
          dangerouslySetInnerHTML={{ __html: page.content.rendered }}
        />
      </div>
    </main>
  );
}
