<<<<<<< HEAD
import NotFound from './NotFound';
=======
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";
import NotFound from "./NotFound"; 
>>>>>>> 3404287898e2c060008cbbaceef8738fc8279310

const WpPage = () => {
  // Pour l'instant, on affiche toujours le 404 stylé
  return <NotFound />;
};

<<<<<<< HEAD
export default WpPage;
=======
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
>>>>>>> 3404287898e2c060008cbbaceef8738fc8279310
