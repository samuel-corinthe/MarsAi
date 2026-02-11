import React, { useState } from "react";
import Seo from "../components/Seo";

export default function CallForProject({ page }) {
  const [open, setOpen] = useState(false);
  const [article, setArticle] = useState(null);
  const [loading, setLoading] = useState(false);

  const openModal = async () => {
    setOpen(true);

    if (article) return;

    setLoading(true);
    try {
      const res = await fetch(
        "/wp-json/wp/v2/posts?slug=appel&_fields=title,content"
      );
      const data = await res.json();
      setArticle(data?.[0] || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const seoTitle = page?.title?.rendered || "Appel a projet";
  const seoDescription = page?.excerpt?.rendered || page?.content?.rendered || "";

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <main className="relative min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-indigo-950 text-white overflow-hidden">

      {/* 🌌 Glow background */}
      <div className="absolute top-[-250px] left-[-250px] w-[700px] h-[700px] bg-blue-500/20 blur-[200px] rounded-full" />
      <div className="absolute bottom-[-250px] right-[-250px] w-[700px] h-[700px] bg-indigo-400/20 blur-[200px] rounded-full" />

      <div className="relative z-10 max-w-5xl mx-auto px-6 py-24">

        {/* 🔷 BOX PRINCIPALE FESTIVAL */}
        <div className="relative group">

          {/* contour lumineux */}
          <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-blue-500 via-indigo-400 to-blue-600 opacity-60 blur-sm group-hover:opacity-100 transition duration-500" />

          <div className="relative bg-blue-950/70 backdrop-blur-xl rounded-3xl border border-blue-400/30 p-14 shadow-[0_0_80px_rgba(59,130,246,0.25)]">

            {/* Titre WP */}
            <h1
              className="text-6xl md:text-7xl font-black uppercase tracking-tight mb-8 bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent"
              dangerouslySetInnerHTML={{ __html: page?.title?.rendered }}
            />

            <div className="h-[3px] w-32 bg-gradient-to-r from-blue-400 to-indigo-400 mb-10" />

            {/* Contenu WP */}
            <div
              className="prose prose-invert prose-lg max-w-none text-blue-100"
              dangerouslySetInnerHTML={{ __html: page?.content?.rendered }}
            />

            {/* Bouton premium */}
            <div className="mt-14">
              <button
                onClick={openModal}
                className="relative px-12 py-5 uppercase font-bold tracking-widest rounded-xl bg-transparent border border-blue-400 text-blue-200 hover:text-white transition-all duration-300 group overflow-hidden"
              >
                <span className="relative z-10">Voir l'appel à projet</span>
                <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-100 transition duration-300" />
              </button>
            </div>

          </div>
        </div>
      </div>

      {/* 🔷 MODAL FESTIVAL PREMIUM */}
      {open && (
        <div className="fixed inset-0 z-50 bg-blue-950/95 backdrop-blur-2xl flex items-center justify-center p-10 animate-fadeIn">

          <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto">

            {/* contour glow */}
            <div className="absolute -inset-[2px] rounded-3xl bg-gradient-to-r from-blue-400 via-indigo-400 to-blue-600 blur-sm opacity-70" />

            <div className="relative bg-gradient-to-br from-blue-900 to-indigo-950 rounded-3xl border border-blue-400/30 p-16 shadow-[0_0_100px_rgba(59,130,246,0.3)]">

              <button
                onClick={() => setOpen(false)}
                className="absolute top-6 right-6 text-blue-300 hover:text-white text-2xl transition"
              >
                ✕
              </button>

              {loading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="w-12 h-12 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mb-6"></div>
                  <p className="uppercase tracking-widest text-blue-300">
                    Chargement...
                  </p>
                </div>
              ) : article ? (
                <>
                  <h2
                    className="text-5xl md:text-6xl font-extrabold mb-8 uppercase bg-gradient-to-r from-white to-blue-300 bg-clip-text text-transparent"
                    dangerouslySetInnerHTML={{
                      __html: article.title.rendered,
                    }}
                  />

                  <div className="h-[3px] w-40 bg-gradient-to-r from-blue-400 to-indigo-400 mb-10" />

                  <div
                    className="prose prose-invert prose-lg max-w-none text-blue-100"
                    dangerouslySetInnerHTML={{
                      __html: article.content.rendered,
                    }}
                  />
                </>
              ) : (
                <p className="text-blue-300">Article introuvable</p>
              )}

            </div>
          </div>
        </div>
      )}
      </main>
    </>
  );
}
