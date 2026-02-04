import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";
import Home from "./Home";
import JuryWpage from "./jury";
import NotFound from "./NotFound";

export default function WpPage({ isHome = false }) {
  const { slug: routeSlug } = useParams();
  const slug = isHome ? "accueil" : routeSlug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const data = await getPageBySlug(slug);
        if (!cancelled) {
          setPage(data); // data peut être null
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setPage(null);
          setLoading(false);
        }
      }
    })();

    return () => (cancelled = true);
  }, [slug]);

  if (loading) return <div className="app-container page">Chargement…</div>;
  if (!page) return <NotFound />;

  // Router vers les composants spécifiques selon le slug
  if (slug === "accueil") {
    return <Home page={page} />;
  }

  if (slug === "jury") {
    return <JuryWpage page={page} />;
  }

  // Page générique WordPress
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
