import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { getPageBySlug } from "../api";
import NotFound from "./NotFound";
//import "./contact.css";

export default function WpPage({ isHome = false }) {
  const { slug: routeSlug } = useParams();
  const slug = isHome ? "accueil" : routeSlug;

  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false); // État pour le chargement

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSending(true);

    const formData = new FormData(e.target);
    const dataToSend = Object.fromEntries(formData);

    try {
      const response = await fetch("http://localhost:3000/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataToSend),
      });

      const result = await response.json();

      if (response.ok) {
        alert("Message envoyé avec succès !");
        e.target.reset();
      } else {
        alert("Erreur : " + result.message);
      }
    } catch (error) {
      alert("Impossible de contacter le serveur.");
    } finally {
      setIsSending(false);
    }
  };

  if (loading) return <div className="app-container page">Chargement…</div>;
  if (!page) return <NotFound />;

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900 p-6 sm:p-12">
      <div className="max-w-3xl bg-white border border-gray-200 p-8 rounded-xl shadow-sm">
        {/* Titre sobre */}
        <h1
          className="text-3xl md:text-4xl font-bold text-gray-900 mb-6"
          dangerouslySetInnerHTML={{ __html: page.title.rendered }}
        />

        {/* Contenu WordPress */}
        <div
          className="prose prose-slate max-w-none mb-10 text-gray-600"
          dangerouslySetInnerHTML={{ __html: page.content.rendered }}
        />

        {slug === "contact" && (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col space-y-1.5">
                <label
                  htmlFor="name"
                  className="text-sm font-medium text-gray-700"
                >
                  Nom complet
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>

              <div className="flex flex-col space-y-1.5">
                <label
                  htmlFor="email"
                  className="text-sm font-medium text-gray-700"
                >
                  Adresse e-mail
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col space-y-1.5">
              <label
                htmlFor="subject"
                className="text-sm font-medium text-gray-700"
              >
                Objet
              </label>
              <input
                type="text"
                id="subject"
                name="subject"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                required
              />
            </div>

            <div className="flex flex-col space-y-1.5">
              <label
                htmlFor="message"
                className="text-sm font-medium text-gray-700"
              >
                Votre message
              </label>
              <textarea
                id="message"
                name="message"
                rows="5"
                className="w-full bg-white border border-gray-300 rounded-lg px-4 py-2.5 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all resize-none"
                required
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={isSending}
              className="w-full bg-gray-900 hover:bg-black text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSending ? "Envoi en cours..." : "Envoyer le message"}
            </button>
          </form>
        )}
      </div>

      {slug === "contact" && (
        <div className="max-w-3xl mt-12 overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white p-2">
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d2903.9622303031174!2d5.3697!3d43.2965!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNDPCsDE3JzQ3LjQiTiA1wrAyMicxMC45IkU!5e0!3m2!1sfr!2sfr!4v1634567890123"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Localisation marsAI"
            className="rounded-lg"
          ></iframe>
        </div>
      )}
    </main>
  );
}
