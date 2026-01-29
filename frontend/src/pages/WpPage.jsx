import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";
import NotFound from "./NotFound";
import "./contact.css";

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
          setPage(data);
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

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = new FormData(e.target);
    console.log("Données Front envoyées :", Object.fromEntries(data));
    alert("Message reçu ! (Simulation Front)");
    e.target.reset();
  };

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

        {slug === "contact" && (
          <form onSubmit={handleSubmit} className="contact-form">
            <div className="form-group">
              <label htmlFor="name">Nom complet</label>
              <input
                type="text"
                id="name"
                name="NAME"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Adresse e-mail</label>
              <input
                type="email"
                id="email"
                name="EMAIL"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="subject">Objet </label>
              <input
                type="text"
                id="subject"
                name="SUBJECT"
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="message">Votre message</label>
              <textarea
                id="message"
                name="MESSAGE"
                className="form-textarea"
                rows="5"
                required
              ></textarea>
            </div>

            <button type="submit" className="btn-submit">
              Envoyer le message
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
