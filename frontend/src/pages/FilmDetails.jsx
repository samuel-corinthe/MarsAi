import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { getMovieById } from "../api";

export default function FilmDetails() {
  const { slug } = useParams();
  const { t } = useTranslation();
  const [movie, setMovie] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getMovieById(slug)
      .then((data) => {
        setMovie(data);
      })
      .catch(() => {
        setError("Film introuvable");
      })
      .finally(() => {
        setLoading(false);
      });
  }, [slug]);

  if (loading) {
    return (
      <div className="min-h-screen bg-blue-950 text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="font-bold uppercase tracking-widest text-sm text-slate-300">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error || !movie) {
    return (
      <div className="min-h-screen bg-blue-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">
          {t("movie_details.not_found", "Film non trouvé")}
        </h1>
        <Link
          to="/films"
          className="bg-cyan-500 text-blue-950 px-8 py-3 rounded-full font-bold uppercase tracking-widest hover:bg-cyan-400 transition-all"
        >
          {t("movie_details.back_to_gallery", "Retour à la galerie")}
        </Link>
      </div>
    );
  }

  
  const youtubeId = movie.youtube_url
    ? new URL(movie.youtube_url).searchParams.get("v")
    : null;

 
  const socialLinks = movie.social_links ? JSON.parse(movie.social_links) : {};

 
  const durationFormatted = movie.duration
    ? `${Math.floor(movie.duration / 60)}min ${movie.duration % 60}s`
    : "N/A";

  // Outils IA (déjà un tableau depuis l'API)
  const aiTools = Array.isArray(movie.ai_tools) ? movie.ai_tools : [];

  return (
    <div className="min-h-screen bg-blue-950 text-white font-sans relative">
      {/* BOUTON RETOUR */}
      <Link
        to="/films"
        className="fixed top-25 left-6 z-50 bg-white/10 backdrop-blur-md p-4 rounded-full text-white hover:bg-cyan-500 transition-all shadow-xl border border-white/10"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
      </Link>

      {/* --- SECTION HERO --- */}
      <section className="relative w-full pt-20 md:pt-32 pb-20 overflow-hidden bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="relative z-10 container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start">
            {/* Poster */}
            <div className="w-64 md:w-80 shrink-0 shadow-2xl rounded-[40px] overflow-hidden border-4 border-white/10">
              {movie.poster_url ? (
                <img
                  src={movie.poster_url}
                  alt={movie.title}
                  className="w-full h-auto object-cover aspect-[2/3]"
                />
              ) : (
                <div className="w-full aspect-[2/3] bg-blue-900 flex items-center justify-center">
                  <span className="text-4xl font-black text-white/20 uppercase tracking-tighter">
                    {movie.title?.charAt(0)}
                  </span>
                </div>
              )}
            </div>

            {/* Infos */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex justify-center md:justify-start gap-2 mb-6">
                <span className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-xs font-bold rounded-full uppercase tracking-wider">
                  {movie.submission_status || "en cours"}
                </span>
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-none uppercase">
                {movie.title}
              </h1>

              <div className="flex justify-center md:justify-start items-center gap-6 text-slate-300 font-medium mb-10 text-lg flex-wrap">
                <span>{movie.release_year}</span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                <span>{durationFormatted}</span>
                {movie.language && (
                  <>
                    <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                    <span>{movie.language}</span>
                  </>
                )}
              </div>

              {youtubeId && (
                <a
                  href={movie.youtube_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-black px-12 py-5 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 mx-auto md:mx-0 uppercase tracking-widest text-sm"
                >
                  Voir sur YouTube
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION CONTENU --- */}
      <section className="relative bg-white text-slate-800 rounded-t-[60px] md:rounded-t-[100px] -mt-12 z-20 pb-20">
        <div className="container mx-auto px-6 md:px-20 pt-20">
          <div className="grid lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              {/* Lecteur YouTube */}
              {youtubeId && (
                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-blue-600 rounded-full"></span>
                    Lecteur
                  </h2>
                  <div className="aspect-video rounded-[30px] overflow-hidden shadow-2xl border border-slate-100">
                    <iframe
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      title={movie.title}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    ></iframe>
                  </div>
                </div>
              )}

              {/* Synopsis */}
              {movie.synopsis && (
                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-blue-600 rounded-full"></span>
                    {t("movie_details.synopsis", "Synopsis")}
                  </h2>
                  <p className="text-xl text-slate-600 leading-relaxed font-medium">
                    {movie.synopsis}
                  </p>
                </div>
              )}

              {/* Outils IA */}
              {aiTools.length > 0 && (
                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-cyan-500 rounded-full"></span>
                    {t("movie_details.ai_stack", "Outils IA")}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {aiTools.map((tool) => (
                      <span
                        key={tool}
                        className="px-5 py-3 bg-slate-100 text-blue-900 font-bold rounded-2xl border border-slate-200 uppercase text-xs tracking-widest"
                      >
                        {tool}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio du réalisateur */}
              {movie.bio && (
                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-blue-600 rounded-full"></span>
                    Bio du réalisateur
                  </h2>
                  <p className="text-lg text-slate-600 leading-relaxed font-medium">
                    {movie.bio}
                  </p>
                </div>
              )}

              {/* Réseaux sociaux */}
              {Object.keys(socialLinks).length > 0 && (
                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-cyan-500 rounded-full"></span>
                    Réseaux sociaux
                  </h2>
                  <div className="flex flex-wrap gap-4">
                    {socialLinks.website && (
                      <a href={socialLinks.website} target="_blank" rel="noopener noreferrer"
                        className="px-6 py-3 bg-slate-100 text-blue-900 font-bold rounded-2xl border border-slate-200 hover:bg-blue-50 transition-all text-sm">
                        Site web
                      </a>
                    )}
                    {socialLinks.instagram && (
                      <a href={socialLinks.instagram} target="_blank" rel="noopener noreferrer"
                        className="px-6 py-3 bg-slate-100 text-blue-900 font-bold rounded-2xl border border-slate-200 hover:bg-blue-50 transition-all text-sm">
                        Instagram
                      </a>
                    )}
                    {socialLinks.x && (
                      <a href={socialLinks.x} target="_blank" rel="noopener noreferrer"
                        className="px-6 py-3 bg-slate-100 text-blue-900 font-bold rounded-2xl border border-slate-200 hover:bg-blue-50 transition-all text-sm">
                        X (Twitter)
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Colonne Droite : Fiche Technique */}
            <div className="bg-slate-50 rounded-[40px] p-8 border border-slate-100 h-fit shadow-sm">
              <h3 className="font-black text-blue-950 mb-8 uppercase text-sm tracking-[0.2em]">
                {t("movie_details.tech_specs", "Fiche technique")}
              </h3>
              <div className="space-y-6">
                <DetailRow label="Soumis par" value={movie.submitted_by} />
                <DetailRow label="Année" value={String(movie.release_year)} />
                <DetailRow label="Durée" value={durationFormatted} />
                <DetailRow label="Langue" value={movie.language} />
                {movie.country_name && (
                  <DetailRow label="Pays" value={movie.country_name} />
                )}
                <DetailRow label="Statut" value={movie.submission_status || "en cours"} />
                <DetailRow label="Vues" value={String(movie.view_count || 0)} last />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

const DetailRow = ({ label, value, last }) => (
  <div className={`flex flex-col ${!last ? "border-b border-slate-200 pb-4" : ""}`}>
    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">
      {label}
    </span>
    <span className="font-bold text-blue-900 uppercase">
      {value || "N/A"}
    </span>
  </div>
);
