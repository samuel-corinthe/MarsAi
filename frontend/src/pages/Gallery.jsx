import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next"; // Import de i18n
import { allMovies } from "../components/MoviesData";

const Gallery = () => {
  const { t, i18n } = useTranslation(); // Initialisation de la traduction
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const searchRef = useRef(null);

  // Liste des filtres (les clés doivent correspondre à ton fichier de traduction)
  const filters = ["All", "Action", "Sci-Fi", "Adventure", "Fantasy", "Drama"];

  const pageSize = 20;
  const topMovies = allMovies.slice(0, 5);
  const carouselShift = "clamp(90px, 18vw, 240px)";
  const carouselPositions = [
    { offset: -2, scale: 0.72, opacity: 0.35, blur: 2, z: 1 },
    { offset: -1, scale: 0.88, opacity: 0.65, blur: 1, z: 2 },
    { offset: 0, scale: 1.05, opacity: 1, blur: 0, z: 3 },
    { offset: 1, scale: 0.88, opacity: 0.65, blur: 1, z: 2 },
    { offset: 2, scale: 0.72, opacity: 0.35, blur: 2, z: 1 },
  ];
  const activeCarouselPositions = carouselPositions.slice(0, topMovies.length);

  // --- LOGIQUE FILTRAGE ---
  const filteredMovies = allMovies.filter((movie) => {
    const matchesFilter =
      activeFilter === "All" || movie.genre.includes(activeFilter);
    const matchesSearch = movie.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const suggestions = allMovies
    .filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        searchQuery.length > 0 &&
        (activeFilter === "All" || m.genre.includes(activeFilter)),
    )
    .slice(0, 5);

  const totalPages = Math.max(1, Math.ceil(filteredMovies.length / pageSize));
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    if (topMovies.length <= 1) return;
    const id = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % topMovies.length);
    }, 2400);
    return () => clearInterval(id);
  }, [topMovies.length]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col font-sans text-slate-800">
      {/* --- HERO SECTION --- */}
      <section className="relative w-full pb-36 md:pb-40 pt-10">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 to-blue-950"></div>
        <div className="relative z-10 container mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-10 mt-8 tracking-tighter uppercase">
            {i18n.language === "fr" ? "Découvrez " : "Discover "}
            <span className="text-cyan-400">
              {t("gallery.title_accent", "nos Merveilles")}
            </span>
          </h1>

          {topMovies.length > 0 && (
            <div className="mt-6 md:mt-10">
              <p className="text-white/90 font-black uppercase tracking-widest text-xs md:text-sm mb-6">
                {t(
                  "gallery.top_movies_subtitle",
                  "Découvrez les 5 meilleurs films",
                )}
              </p>
              <div className="relative h-44 md:h-56 flex items-center justify-center">
                {topMovies.map((movie, index) => {
                  const positionIndex =
                    (index - carouselIndex + topMovies.length) %
                    topMovies.length;
                  const pos = activeCarouselPositions[positionIndex];
                  if (!pos) return null;
                  return (
                    <Link
                      to={`/movie/${movie.id}`}
                      key={movie.id}
                      className="absolute left-1/2 top-1/2 w-52 sm:w-60 md:w-72 transition-all duration-700 ease-out"
                      style={{
                        transform: `translate(-50%, -50%) translateX(calc(${pos.offset} * ${carouselShift})) scale(${pos.scale})`,
                        opacity: pos.opacity,
                        filter: `blur(${pos.blur}px)`,
                        zIndex: pos.z,
                      }}
                    >
                      <div className="group relative aspect-[16/9] rounded-[28px] overflow-hidden shadow-2xl bg-blue-950/80 border border-white/10">
                        <img
                          src={movie.img}
                          alt={movie.title}
                          className="w-full h-full object-cover opacity-95 group-hover:opacity-40 transition-all duration-700"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-950">
                            <svg
                              className="w-6 h-6 ml-1"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                            </svg>
                          </div>
                        </div>
                        <div className="absolute bottom-3 left-0 right-0 px-4 text-white text-sm font-black uppercase text-center opacity-0 group-hover:opacity-100 transition-opacity">
                          {movie.title}
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* --- GALLERY SECTION --- */}
      <section className="relative flex-grow">
        <div className="absolute -top-20 left-0 w-full h-20 bg-blue-950">
          <div className="w-full h-full bg-white rounded-tl-[80px] md:rounded-tl-[120px]"></div>
        </div>

        <div className="bg-white min-h-[500px] w-full relative z-20 pb-20">
          <div className="container mx-auto px-6 md:px-20 pt-8">
            <div className="flex flex-col items-center gap-8 mb-16">
              <div className="relative w-full max-w-2xl" ref={searchRef}>
                <div className="relative">
                  <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                    <svg
                      className="w-5 h-5 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="3"
                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                      />
                    </svg>
                  </div>
                  <input
                    type="text"
                    placeholder={t(
                      "gallery.search_placeholder",
                      "Rechercher un film...",
                    )}
                    value={searchQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-lg font-bold text-blue-950 focus:bg-white focus:border-blue-600 outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Autocomplétion */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                    {suggestions.map((movie) => (
                      <Link
                        key={movie.id}
                        to={`/movie/${movie.id}`}
                        onClick={() => setShowSuggestions(false)}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors border-b last:border-none border-slate-50"
                      >
                        <img
                          src={movie.img}
                          alt=""
                          className="w-16 h-9 object-cover rounded-lg shadow-md"
                        />
                        <div>
                          <p className="font-black text-blue-950 text-sm uppercase tracking-tighter">
                            {movie.title}
                          </p>
                          <p className="text-[10px] text-cyan-600 font-black uppercase tracking-widest">
                            {Array.isArray(movie.genre)
                              ? movie.genre[0]
                              : movie.genre}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>

              {/* Filtres de Catégories Traduits */}
              <div className="flex flex-wrap justify-center gap-3">
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-8 py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all
                         ${activeFilter === f ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/40" : "bg-white border-slate-100 text-slate-400 hover:text-blue-500 hover:border-blue-200"}
                    `}
                  >
                    {t(`genres.${f.toLowerCase()}`, f)}{" "}
                    {/* Traduction du genre */}
                  </button>
                ))}
              </div>
            </div>

            {/* GRID DE FILMS */}
            {filteredMovies.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
                {paginatedMovies.map((movie) => (
                  <Link to={`/movie/${movie.id}`} key={movie.id}>
                    <div className="group relative aspect-[16/9] rounded-[35px] overflow-hidden shadow-2xl bg-blue-950 border border-slate-100">
                      <img
                        src={movie.img}
                        alt={movie.title}
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-30 transition-all duration-700 transform group-hover:scale-110"
                      />
                      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 opacity-0 group-hover:opacity-100 transition-all duration-300">
                        <h3 className="text-white font-black text-xl text-center uppercase leading-none mb-4 tracking-tighter">
                          {movie.title}
                        </h3>
                        <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-blue-950 shadow-xl">
                          <svg
                            className="w-6 h-6 ml-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xl">
                {t("gallery.no_results", "Aucun résultat trouvé")}
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-20 flex-wrap">
                {Array.from({ length: totalPages }, (_, index) => {
                  const page = index + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black transition-colors ${
                        page === currentPage
                          ? "bg-blue-600 text-white shadow-xl"
                          : "text-slate-400 border-2 border-transparent hover:text-blue-600 hover:border-blue-200"
                      }`}
                    >
                      {page}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Gallery;
