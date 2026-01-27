import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";

export default function WpPage({ isHome = false }) {
  const { slug: routeSlug } = useParams();
  const slug = isHome ? "accueil" : routeSlug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      const data = await getPageBySlug(slug);
      if (!cancelled) {
        setPage(data);
        setLoading(false);
      }
    })().catch(() => {
      if (!cancelled) {
        setPage(null);
        setLoading(false);
      }
    });

    return () => (cancelled = true);
  }, [slug]);

  if (loading) return <div className="app-container page">Chargement…</div>;
  if (!page) return <div className="app-container page">Page introuvable</div>;

  return (
    <main className="app-container page">
      <div className="card card-pad">
        <h1 className="h1" dangerouslySetInnerHTML={{ __html: page.title.rendered }} />
        <div className="richtext mt-6" dangerouslySetInnerHTML={{ __html: page.content.rendered }} />
      </div>
    </main>
  );
}
