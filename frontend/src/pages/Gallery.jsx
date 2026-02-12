import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

const Gallery = () => {
  // --- ÉTATS DES DONNÉES ---
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- ÉTATS UI ---
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const searchRef = useRef(null);

  const filters = ["All", "Action", "Sci-Fi", "Adventure", "Fantasy", "Drama"];
  const pageSize = 20;

  // --- RÉCUPÉRATION MARIADB (via API locale) ---
  useEffect(() => {
    const fetchMovies = async () => {
      try {
        setIsLoading(true);
        const response = await fetch("http://localhost:3000/api/movies");
        if (!response.ok) throw new Error("Serveur API injoignable");
        const data = await response.json();
        setMovies(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchMovies();
  }, []);

  // --- LOGIQUE DE FILTRAGE & AUTOCOMPLÉTION ---
  // On filtre d'abord par genre et par texte pour la grille
  const filteredMovies = movies.filter((movie) => {
    const movieGenres = Array.isArray(movie.genre)
      ? movie.genre
      : [movie.genre];
    const matchesFilter =
      activeFilter === "All" || movieGenres.includes(activeFilter);
    const matchesSearch = movie.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Logique spécifique pour les suggestions d'autocomplétion
  const suggestions = movies
    .filter((m) => {
      const matchesSearch = m.title
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const movieGenres = Array.isArray(m.genre) ? m.genre : [m.genre];
      const matchesFilter =
        activeFilter === "All" || movieGenres.includes(activeFilter);
      return searchQuery.length > 0 && matchesSearch && matchesFilter;
    })
    .slice(0, 5); // Limiter à 5 résultats pour l'UI

  // Pagination & Carousel
  const topMovies = movies.slice(0, 5);
  const totalPages = Math.max(1, Math.ceil(filteredMovies.length / pageSize));
  const paginatedMovies = filteredMovies.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // --- EFFETS SECONDAIRES ---
  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, searchQuery]);

  useEffect(() => {
    if (topMovies.length <= 1) return;
    const id = setInterval(
      () => setCarouselIndex((prev) => (prev + 1) % topMovies.length),
      3000,
    );
    return () => clearInterval(id);
  }, [topMovies.length]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target))
        setShowSuggestions(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // --- RENDU ---
  if (isLoading)
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center text-cyan-400 font-black animate-pulse uppercase tracking-widest">
        Chargement MariaDB...
      </div>
    );
  if (error)
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center text-red-500 font-black italic">
        {error}
      </div>
    );

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col font-sans">
      {/* Hero Carousel */}
      <section className="relative w-full pb-32 pt-10 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/40 to-blue-950"></div>
        <div className="relative z-10 container mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-16 uppercase tracking-tighter">
            BDD <span className="text-cyan-400">Connectée</span>
          </h1>
          <div className="relative h-48 md:h-64 flex items-center justify-center">
            {topMovies.map((movie, index) => {
              const diff =
                ((index - carouselIndex + topMovies.length) %
                  topMovies.length) -
                2;
              const isCenter = diff === 0;
              return (
                <Link
                  to={`/movie/${movie.id}`}
                  key={movie.id}
                  className="absolute transition-all duration-700 w-60 md:w-80 shadow-2xl rounded-3xl overflow-hidden border border-white/10"
                  style={{
                    transform: `translateX(${diff * 115}%) scale(${isCenter ? 1.1 : 0.8})`,
                    opacity: Math.abs(diff) > 2 ? 0 : isCenter ? 1 : 0.5,
                    zIndex: 10 - Math.abs(diff),
                    filter: isCenter ? "none" : "blur(2px)",
                  }}
                >
                  <img
                    src={movie.img}
                    alt={movie.title}
                    className="w-full h-full object-cover aspect-video"
                  />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Galerie Principale */}
      <section className="bg-white rounded-tl-[80px] flex-grow pb-20 -mt-10 relative z-20">
        <div className="container mx-auto px-6 md:px-20 pt-16">
          {/* Barre de Recherche avec Autocomplétion */}
          <div
            className="flex flex-col items-center gap-8 mb-16"
            ref={searchRef}
          >
            <div className="relative w-full max-w-2xl">
              <input
                type="text"
                placeholder="Rechercher un film..."
                value={searchQuery}
                onFocus={() => setShowSuggestions(true)}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-6 py-5 bg-slate-100 rounded-3xl font-bold text-blue-950 focus:bg-white border-2 border-transparent focus:border-blue-500 outline-none transition-all shadow-inner"
              />

              {/* SUGGESTIONS DYNAMIQUE */}
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                  {suggestions.map((m) => (
                    <Link
                      key={m.id}
                      to={`/movie/${m.id}`}
                      onClick={() => setShowSuggestions(false)}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors border-b last:border-none border-slate-50"
                    >
                      <img
                        src={m.img}
                        className="w-14 h-8 object-cover rounded shadow"
                        alt=""
                      />
                      <div>
                        <p className="font-black text-blue-950 text-sm uppercase tracking-tighter">
                          {m.title}
                        </p>
                        <p className="text-[10px] text-cyan-600 font-bold uppercase">
                          {Array.isArray(m.genre) ? m.genre[0] : m.genre}
                        </p>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>

            {/* Filtres par Genre */}
            <div className="flex flex-wrap justify-center gap-2">
              {filters.map((f) => (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`px-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeFilter === f ? "bg-blue-600 text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Grille de Films */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {paginatedMovies.map((movie) => (
              <Link to={`/movie/${movie.id}`} key={movie.id} className="group">
                <div className="aspect-video rounded-[30px] overflow-hidden bg-slate-200 shadow-xl relative border border-slate-50">
                  <img
                    src={movie.img}
                    alt={movie.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-950/90 via-transparent to-transparent flex flex-col justify-end p-6 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-white font-black uppercase text-xs tracking-widest text-center">
                      {movie.title}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-3 mt-16">
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`w-10 h-10 rounded-xl font-black text-sm transition-all ${currentPage === i + 1 ? "bg-blue-600 text-white shadow-lg shadow-blue-200" : "bg-slate-100 text-slate-400 hover:bg-slate-200"}`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default Gallery;
