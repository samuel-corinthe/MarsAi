import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
const Gallery = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [playingVideos, setPlayingVideos] = useState({});
  const videoRefs = useRef({});
  const searchRef = useRef(null);

  const filters = ["All", "Action", "Sci-Fi", "Adventure", "Fantasy", "Drama"];

  // Simulation d'une base de données plus large pour voir la pagination
  const allMovies = [
    {
      id: 1,
      title: "ECHOES OF TOMORROW",
      genre: "Sci-Fi",
      img: "https://miro.medium.com/v2/resize:fit:1100/format:webp/1*0_vOI1a7qNAWkLgd_Gn7AA.jpeg",
    },
    {
      id: 2,
      title: "NEON NIGHTS",
      genre: "Action",
      img: "https://plus.unsplash.com/premium_photo-1666700698920-d2d2bba589f8?q=80&w=1332&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 3,
      title: "DESERT QUEST",
      genre: "Adventure",
      img: "https://plus.unsplash.com/premium_photo-1671611799147-68a4f9b3f0e1?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    },
    {
      id: 4,
      title: "MAGIC REALM",
      genre: "Fantasy",
      img: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400",
    },
    {
      id: 5,
      title: "SILENT ECHO",
      genre: "Drama",
      img: "https://images.unsplash.com/photo-1485846234645-a62644f84728?q=80&w=400",
    },
    {
      id: 6,
      title: "CYBER ATTACK",
      genre: "Sci-Fi",
      img: "https://images.unsplash.com/photo-1550745165-9bc0b252726f?q=80&w=400",
    },
    {
      id: 7,
      title: "FROZEN TIME",
      genre: "Sci-Fi",
      img: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?q=80&w=400",
    },
    {
      id: 8,
      title: "THE LAST GATE",
      genre: "Fantasy",
      img: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?q=80&w=400",
    },
  ];

  // --- LOGIQUE FILTRAGE & AUTOCOMPLETION ---
  const suggestions = allMovies
    .filter(
      (m) =>
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        searchQuery.length > 0 &&
        (activeFilter === "All" || m.genre === activeFilter),
    )
    .slice(0, 5);

  const filteredMovies = allMovies.filter((movie) => {
    const matchesFilter =
      activeFilter === "All" || movie.genre === activeFilter;
    const matchesSearch = movie.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Fermer suggestions au clic extérieur
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
      <section className="relative w-full pb-32 pt-10">
        <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 to-blue-950"></div>
        <div className="relative z-10 container mx-auto px-6 text-center">
          <h1 className="text-3xl md:text-5xl font-black text-white mb-10 mt-8 tracking-tighter uppercase">
            Discover <span className="text-cyan-400">Cinematic Wonders</span>
          </h1>
        </div>
      </section>

      {/* --- GALLERY SECTION --- */}
      <section className="relative flex-grow">
        <div className="absolute -top-20 left-0 w-full h-20 bg-blue-950">
          <div className="w-full h-full bg-white rounded-tl-[80px] md:rounded-tl-[120px]"></div>
        </div>

        <div className="bg-white min-h-[500px] w-full relative z-20 pb-20">
          <div className="container mx-auto px-6 md:px-20 pt-8">
            {/* --- RECHERCHE & FILTRES --- */}
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
                    placeholder="Search movie title..."
                    value={searchQuery}
                    onFocus={() => setShowSuggestions(true)}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setShowSuggestions(true);
                    }}
                    className="w-full pl-14 pr-6 py-5 bg-slate-50 border-2 border-slate-100 rounded-3xl text-lg font-bold text-blue-950 focus:bg-white focus:border-blue-600 focus:outline-none transition-all shadow-sm"
                  />
                </div>

                {/* Autocompletion Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-[100] w-full mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
                    {suggestions.map((movie) => (
                      <button
                        key={movie.id}
                        onClick={() => {
                          setSearchQuery(movie.title);
                          setShowSuggestions(false);
                        }}
                        className="w-full flex items-center gap-4 px-6 py-4 hover:bg-blue-50 transition-colors text-left"
                      >
                        <img
                          src={movie.img}
                          alt=""
                          className="w-10 h-14 object-cover rounded-lg shadow-md"
                        />
                        <div>
                          <p className="font-black text-blue-950 text-sm uppercase tracking-tighter">
                            {movie.title}
                          </p>
                          <p className="text-[10px] text-cyan-600 font-black uppercase tracking-widest">
                            {movie.genre}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filtres de Catégories */}
              <div className="flex flex-wrap justify-center gap-3">
                {filters.map((f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFilter(f)}
                    className={`px-8 py-3 rounded-2xl border-2 text-xs font-black uppercase tracking-widest transition-all
                         ${activeFilter === f ? "bg-blue-600 border-blue-600 text-white shadow-xl shadow-blue-500/40" : "bg-white border-slate-100 text-slate-400 hover:text-blue-500 hover:border-blue-200"}
                    `}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            {/* --- GRID DE FILMS --- */}
            {filteredMovies.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
                {filteredMovies.map((movie) => (
                  <Link to={`/movie/${movie.id}`} key={movie.id}>
                    <div
                      key={movie.id}
                      className="group relative aspect-[2/3] rounded-[35px] overflow-hidden shadow-2xl bg-blue-950 border border-slate-100"
                    >
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
                No results found
              </div>
            )}

            {/* --- PAGINATION --- */}
            <div className="flex justify-center items-center gap-2 mt-20">
              <button className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-xl shadow-blue-500/30 font-black">
                1
              </button>
              {[2, 3].map((n) => (
                <button
                  key={n}
                  className="w-12 h-12 rounded-2xl text-slate-400 hover:text-blue-600 hover:bg-slate-50 border-2 border-transparent hover:border-slate-100 flex items-center justify-center transition-all font-bold"
                >
                  {n}
                </button>
              ))}
              <span className="text-slate-300 px-2">...</span>
              <button className="w-12 h-12 rounded-2xl text-slate-400 hover:text-blue-600 flex items-center justify-center font-bold">
                10
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Gallery;
