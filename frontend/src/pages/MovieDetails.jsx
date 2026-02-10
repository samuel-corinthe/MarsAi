import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

const MovieDetails = () => {
  const { id } = useParams();

  // --- ÉTATS DONNÉES ---
  const [movie, setMovie] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- ÉTATS UI ---
  const [isAdmin] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officialRating, setOfficialRating] = useState(null);
  const [tempRating, setTempRating] = useState(0);

  // --- RÉCUPÉRATION DU FILM ---
  useEffect(() => {
    const fetchMovie = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:5000/movies/${id}`);
        if (!response.ok) throw new Error("Film introuvable dans la base");
        const data = await response.json();

        setMovie(data);
        setOfficialRating(data.rating || 0); // Utilise la note de la BDD si elle existe
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovie();
  }, [id]);

  const openRatingModal = () => {
    setTempRating(officialRating || 0);
    setIsModalOpen(true);
  };

  const handleDeleteVote = () => {
    setOfficialRating(null);
    setIsModalOpen(false);
    // Optionnel : Ajouter ici un fetch(PUT) pour mettre à jour la BDD
  };

  if (isLoading)
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );

  if (error || !movie)
    return (
      <div className="min-h-screen bg-blue-950 text-white flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">
          Film non trouvé
        </h1>
        <Link
          to="/films"
          className="bg-cyan-500 text-blue-950 px-8 py-3 rounded-full font-bold uppercase hover:bg-cyan-400 transition-all"
        >
          Retour à la galerie
        </Link>
      </div>
    );

  return (
    <div className="min-h-screen bg-blue-950 text-white font-sans relative">
      {/* BOUTON RETOUR */}
      <Link
        to="/films"
        className="fixed top-28 left-6 z-50 bg-white/10 backdrop-blur-md p-4 rounded-full text-white hover:bg-cyan-500 transition-all shadow-xl border border-white/10"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M10 19l-7-7m0 0l7-7m-7 7h18"
          />
        </svg>
      </Link>

      {/* --- SECTION HERO --- */}
      <section className="relative w-full pt-20 md:pt-32 pb-20 overflow-hidden bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="relative z-10 container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start">
            {/* Poster */}
            <div className="w-64 md:w-80 shrink-0 shadow-2xl rounded-[40px] overflow-hidden border-4 border-white/10">
              <img
                src={movie.img}
                alt={movie.title}
                className="w-full h-auto object-cover aspect-[2/3]"
              />
            </div>

            {/* Infos Entête */}
            <div className="flex-1 text-center md:text-left">
              <div className="flex justify-center md:justify-start gap-2 mb-6">
                {movie.genre?.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-xs font-bold rounded-full uppercase"
                  >
                    {g}
                  </span>
                ))}
              </div>
              <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-none uppercase italic">
                {movie.title}
              </h1>

              <div className="flex justify-center md:justify-start items-center gap-6 text-slate-300 font-medium mb-10 text-lg">
                <span className="flex items-center gap-2">
                  <span className="text-yellow-400 text-2xl">★</span>
                  {officialRating ? `${officialRating}/5` : "N/A"}
                </span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                <span>{movie.releaseDate}</span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                <span>{movie.duration}</span>
              </div>

              <button className="bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-black px-12 py-5 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 uppercase tracking-widest text-sm">
                Regarder le Film
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION CONTENU --- */}
      <section className="relative bg-white text-slate-800 rounded-t-[60px] md:rounded-t-[100px] -mt-12 z-20 pb-20">
        <div className="container mx-auto px-6 md:px-20 pt-20">
          <div className="grid lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              {/* Synopsis */}
              <div className="mb-12">
                <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                  <span className="w-10 h-2 bg-blue-600 rounded-full"></span>{" "}
                  Synopsis
                </h2>
                <p className="text-xl text-slate-600 leading-relaxed font-medium">
                  {movie.description ||
                    "Aucune description disponible pour ce film."}
                </p>
              </div>

              {/* Stack IA */}
              <div className="mb-12">
                <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                  <span className="w-10 h-2 bg-cyan-500 rounded-full"></span>{" "}
                  Stack IA
                </h2>
                <div className="flex flex-wrap gap-3">
                  {movie.aiTools?.length > 0 ? (
                    movie.aiTools.map((tool) => (
                      <span
                        key={tool}
                        className="px-5 py-3 bg-slate-100 text-blue-900 font-bold rounded-2xl border border-slate-200 uppercase text-xs"
                      >
                        {tool}
                      </span>
                    ))
                  ) : (
                    <p className="text-slate-400 italic">
                      Aucun outil IA spécifié.
                    </p>
                  )}
                </div>
              </div>

              {/* Casting */}
              <div className="mb-12">
                <h2 className="text-3xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter">
                  <span className="w-10 h-2 bg-blue-600 rounded-full"></span>{" "}
                  Casting
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {movie.cast?.map((p, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-4 p-5 rounded-[30px] bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all"
                    >
                      <img
                        src={p.img || "https://via.placeholder.com/150"}
                        className="w-16 h-16 rounded-2xl object-cover shadow-md"
                        alt={p.name}
                      />
                      <div>
                        <p className="font-black text-blue-900 leading-tight uppercase tracking-tighter">
                          {p.name}
                        </p>
                        <p className="text-sm text-slate-400 font-bold uppercase">
                          {p.role}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Zone Admin */}
              {isAdmin && (
                <div className="mt-16 p-8 bg-blue-950 rounded-[40px] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl border border-white/10">
                  <div>
                    <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-1">
                      Database Access
                    </p>
                    <h4 className="text-white font-black text-2xl uppercase tracking-tighter">
                      Note :{" "}
                      {officialRating ? `${officialRating}/5` : "Non noté"}
                    </h4>
                  </div>
                  <button
                    onClick={openRatingModal}
                    className="bg-white text-blue-950 font-black px-10 py-4 rounded-2xl hover:bg-cyan-400 transition-all uppercase tracking-widest text-sm"
                  >
                    Gérer la Note
                  </button>
                </div>
              )}
            </div>

            {/* Fiche Technique */}
            <div className="bg-slate-50 rounded-[40px] p-8 border border-slate-100 h-fit shadow-sm">
              <h3 className="font-black text-blue-950 mb-8 uppercase text-sm tracking-widest">
                Fiche Technique
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col border-b border-slate-200 pb-4">
                  <span className="text-[10px] uppercase font-black text-slate-400 mb-1">
                    Réalisateur
                  </span>
                  <span className="text-[10px] uppercase font-black text-slate-400 mb-1">
                    Pays
                  </span>
                  <img
                    src="../public/images/flags/ad.png"
                    alt={movie.title}
                    className="w-15 "
                  />
                  <span className="font-bold text-blue-900 uppercase">
                    {movie.director}
                  </span>
                </div>
                <div className="flex flex-col border-b border-slate-200 pb-4">
                  <span className="text-[10px] uppercase font-black text-slate-400 mb-1">
                    Date de Sortie
                  </span>
                  <span className="font-bold text-blue-900 uppercase">
                    {movie.releaseDate}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] uppercase font-black text-slate-400 mb-1">
                    Durée
                  </span>
                  <span className="font-bold text-blue-900 uppercase">
                    {movie.duration}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- MODALE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-blue-950/95 backdrop-blur-md"
            onClick={() => setIsModalOpen(false)}
          ></div>
          <div className="relative bg-white rounded-[50px] p-12 w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-3xl font-black text-blue-950 mb-8 uppercase tracking-tighter italic">
              Évaluer
            </h3>
            <div className="flex justify-center gap-3 mb-12">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setTempRating(num)}
                  className={`w-12 h-14 rounded-2xl font-black text-2xl transition-all ${tempRating === num ? "bg-blue-600 text-white scale-110 shadow-xl" : "bg-slate-100 text-slate-300"}`}
                >
                  {num}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setOfficialRating(tempRating);
                setIsModalOpen(false);
              }}
              className="w-full py-5 bg-blue-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all"
            >
              Confirmer
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
