import React, { useState } from "react";

const MovieDetails = () => {
  // --- ÉTATS ---
  const [isAdmin] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officialRating, setOfficialRating] = useState(4);
  const [tempRating, setTempRating] = useState(0);

  const movie = {
    title: "ECHOES OF TOMORROW",
    year: "2026",
    releaseDate: "4 Février 2026", // Ajout de la date précise
    director: "Christopher Nolan", // Ajout du directeur
    duration: "50 sec",
    posterUrl:
      "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=1000&auto=format&fit=crop",
    genre: ["Sci-Fi", "Action", "Adventure"],
    aiTools: ["Midjourney", "Runway Gen-2", "ElevenLabs", "Suno AI"], // Ajout des outils IA
    description:
      "Dans un monde où les souvenirs peuvent être numérisés et échangés, un jeune technicien découvre un fragment de mémoire capable de réécrire l'histoire d'une société dystopique.",
    cast: [
      {
        name: "Alex Rivers",
        role: "Protagoniste",
        img: "https://i.pravatar.cc/150?u=alex",
      },
      {
        name: "Sarah Chen",
        role: "Ingénieure en chef",
        img: "https://i.pravatar.cc/150?u=sarah",
      },
      {
        name: "Marcus Thorne",
        role: "Antagoniste",
        img: "https://i.pravatar.cc/150?u=marcus",
      },
    ],
  };

  const openRatingModal = () => {
    setTempRating(officialRating || 0);
    setIsModalOpen(true);
  };

  const handleDeleteVote = () => {
    setOfficialRating(null);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-blue-950 text-white font-sans relative">
      {/* --- SECTION HERO --- */}
      <section className="relative w-full pt-10 md:pt-24 pb-20 md:pb-25 overflow-hidden bg-gradient-to-b from-blue-900 to-blue-950">
        <div className="relative z-10 container mx-auto px-6">
          <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start">
            <div className="w-64 h-70 md:w-80 shrink-0 shadow-2xl rounded-3xl overflow-hidden border-4 border-white/10">
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-auto object-cover aspect-[2/3]"
              />
            </div>

            <div className="flex-1 text-center md:text-left">
              <div className="flex justify-center md:justify-start gap-2 mb-6">
                {movie.genre.map((g) => (
                  <span
                    key={g}
                    className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 text-cyan-300 text-xs font-bold rounded-full uppercase tracking-wider"
                  >
                    {g}
                  </span>
                ))}
              </div>
              <h1 className="text-4xl md:text-6xl font-black tracking-tighter mb-6 leading-none uppercase">
                {movie.title}
              </h1>

              <div className="flex justify-center md:justify-start items-center gap-6 text-slate-300 font-medium mb-10 text-lg">
                <span className="flex items-center gap-2">
                  <span className="text-yellow-400 text-2xl">★</span>
                  {officialRating ? `${officialRating}/5` : "Non noté"}
                </span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                <span>{movie.releaseDate}</span>
                <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                <span>{movie.duration}</span>
              </div>

              <button className="bg-cyan-500 hover:bg-cyan-400 text-blue-950 font-bold px-10 py-4 rounded-full transition-all flex items-center justify-center gap-3 shadow-lg shadow-cyan-500/20 mx-auto md:mx-0">
                VOIR LE FILM
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* --- SECTION CONTENU --- */}
      <section className="relative bg-white text-slate-800 rounded-t-[50px] md:rounded-t-[100px] -mt-12 z-20 pb-20">
        <div className="container mx-auto px-6 md:px-20 pt-20">
          <div className="grid lg:grid-cols-3 gap-16">
            <div className="lg:col-span-2">
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-1.5 bg-blue-600 rounded-full"></span>{" "}
                  Synopsis
                </h2>
                <p className="text-xl text-slate-600 leading-relaxed">
                  {movie.description}
                </p>
              </div>

              {/* OUTILS IA */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
                  <span className="w-10 h-1.5 bg-blue-600 rounded-full"></span>{" "}
                  Outils IA
                </h2>
                <div className="flex flex-wrap gap-3">
                  {movie.aiTools.map((tool) => (
                    <span
                      key={tool}
                      className="px-4 py-2 bg-slate-100 text-blue-900 font-bold rounded-xl border border-slate-200"
                    >
                      {tool}
                    </span>
                  ))}
                </div>
              </div>

              {/* CASTING */}
              <div className="mb-12">
                <h2 className="text-3xl font-bold mb-8 flex items-center gap-3">
                  <span className="w-10 h-1.5 bg-blue-600 rounded-full"></span>{" "}
                  Casting
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
                  {movie.cast.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-100"
                    >
                      <img
                        src={p.img}
                        className="w-14 h-14 rounded-xl object-cover"
                        alt={p.name}
                      />
                      <div>
                        <p className="font-bold text-blue-900 leading-tight">
                          {p.name}
                        </p>
                        <p className="text-sm text-slate-500">{p.role}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* --- ZONE ADMIN --- */}
                {isAdmin && (
                  <div className="p-8 bg-blue-950 rounded-[40px] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl border border-white/10">
                    <div>
                      <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-1">
                        Administration
                      </p>
                      <h4 className="text-white font-black text-2xl tracking-tighter">
                        {officialRating
                          ? `Note actuelle : ${officialRating}/5`
                          : "Aucune note définie"}
                      </h4>
                    </div>
                    <button
                      onClick={openRatingModal}
                      className="bg-white text-blue-950 font-black px-10 py-4 rounded-2xl hover:bg-cyan-400 transition-all"
                    >
                      VOTER
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* SIDEBAR */}
            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 shadow-sm h-fit">
              <h3 className="font-bold text-blue-950 mb-6 uppercase text-sm tracking-widest">
                Fiche Technique
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-slate-200 pb-3 text-sm">
                  <span className="text-slate-500">Note Globale</span>
                  <span
                    className={`font-bold ${officialRating ? "text-blue-600" : "text-slate-400"}`}
                  >
                    {officialRating ? `${officialRating} / 5` : "N/A"}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-3 text-sm">
                  <span className="text-slate-500">Directeur</span>
                  <span className="font-bold">{movie.director}</span>
                </div>
                <div className="flex justify-between border-b border-slate-200 pb-3 text-sm">
                  <span className="text-slate-500">Parution</span>
                  <span className="font-bold">{movie.releaseDate}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* --- MODALE DE VOTE --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-blue-950/90 backdrop-blur-xl"
            onClick={() => setIsModalOpen(false)}
          ></div>

          <div className="relative bg-white rounded-[50px] p-10 w-full max-w-sm shadow-2xl text-center">
            <h3 className="text-3xl font-black text-blue-950 mb-2 uppercase tracking-tighter">
              Vote Admin
            </h3>
            <p className="text-slate-500 mb-8 text-sm font-medium uppercase tracking-widest">
              Modifier ou supprimer la note
            </p>

            <div className="flex justify-center gap-3 mb-10">
              {[1, 2, 3, 4, 5].map((num) => (
                <button
                  key={num}
                  onClick={() => setTempRating(num)}
                  className={`w-12 h-14 rounded-2xl font-black text-2xl transition-all ${
                    tempRating === num
                      ? "bg-blue-600 text-white scale-110 shadow-xl"
                      : "bg-slate-100 text-slate-400 hover:bg-slate-200"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setOfficialRating(tempRating);
                  setIsModalOpen(false);
                }}
                className="w-full py-5 bg-blue-950 text-white rounded-3xl font-black tracking-widest hover:bg-blue-800 transition-all"
              >
                ENREGISTRER
              </button>

              {officialRating && (
                <button
                  onClick={handleDeleteVote}
                  className="w-full py-4 bg-red-50 text-red-500 rounded-3xl font-bold hover:bg-red-100 transition-all text-sm uppercase tracking-wider"
                >
                  Supprimer mon vote
                </button>
              )}

              <button
                onClick={() => setIsModalOpen(false)}
                className="py-2 text-slate-400 font-bold text-sm"
              >
                ANNULER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MovieDetails;
