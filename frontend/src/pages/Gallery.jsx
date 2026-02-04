import React, { useState, useRef } from "react";

const Gallery = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [playingVideos, setPlayingVideos] = useState({});
  const videoRefs = useRef({});
  const filters = ["All", "Action", "Sci-Fi", "Adventure", "Fantasy", "Drama"];

  // Données fictives pour la galerie
  const featuredMovies = [1, 2, 3, 4];
  const galleryMovies = Array(12).fill({
    title: "ECHOES OF TOMORROW",
  });

  const toggleVideo = (index) => {
    const video = videoRefs.current[index];
    if (video) {
      if (playingVideos[index]) {
        video.pause();
        setPlayingVideos((prev) => ({ ...prev, [index]: false }));
      } else {
        video.play();
        setPlayingVideos((prev) => ({ ...prev, [index]: true }));
      }
    }
  };

  return (
    <div className="min-h-screen bg-blue-950 flex flex-col font-sans text-slate-800">
      {/* --- HERO SECTION (Dark Blue) --- */}
      <section className="relative w-full pb-32 pt-10">
        {/* Background Image/Gradient */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Image de fond ville futuriste (placeholder) */}
          <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1574360799797-40c21a18274d?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-30 mix-blend-overlay"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/80 to-blue-950"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 container mx-auto px-6 flex flex-col items-center">
          {/* Top Decorative Filters (Style maquette) */}
          <div className="hidden md:flex absolute top-0 left-0 bg-white/10 backdrop-blur-md border border-white/20 rounded-b-3xl px-8 py-4 gap-4 transform -translate-y-1/2">
            <div className="w-12 h-1 bg-cyan-400 rounded-full"></div>
          </div>

          <h1 className="text-3xl md:text-5xl font-bold text-white mb-10 mt-8 text-center tracking-wide">
            Discover the five best movies
          </h1>

          {/* Featured Carousel */}
          <div className="flex gap-4 md:gap-8 overflow-x-auto w-full justify-center pb-4 px-4 snap-x">
            {featuredMovies.map((i) => (
              <div
                key={i}
                className="flex-shrink-0 w-64 h-36 md:w-80 md:h-48 rounded-xl overflow-hidden relative group cursor-pointer border border-white/10 hover:border-cyan-400 transition-all shadow-2xl snap-center"
              >
                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/20 transition-all z-10"></div>
                <video
                  ref={(el) => (videoRefs.current[i] = el)}
                  src={`/Tailwind in 100 Seconds.mp4`}
                  className="w-full h-full object-cover"
                  muted
                  loop
                  playsInline
                />
                {/* Play Button */}
                <div
                  className="absolute inset-0 flex items-center justify-center z-20"
                  onClick={() => toggleVideo(i)}
                >
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/50 group-hover:scale-110 transition-transform">
                    {!playingVideos[i] ? (
                      <div className="w-0 h-0 border-l-[12px] border-l-white border-y-[8px] border-y-transparent ml-1"></div>
                    ) : (
                      <div className="flex gap-1">
                        <div className="w-1 h-3 bg-white"></div>
                        <div className="w-1 h-3 bg-white"></div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="absolute bottom-3 left-4 z-20 text-white font-bold text-sm tracking-widest uppercase">
                  Metropolis {i}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- WHITE CURVED SECTION --- */}
      <section className="relative flex-grow">
        {/* Curve Top Decor */}
        <div className="absolute -top-20 left-0 w-full h-20 bg-blue-950 overflow-hidden">
          <div className="w-full h-full bg-white rounded-tl-[80px] md:rounded-tl-[120px]"></div>
        </div>

        {/* Main Content Container */}
        <div className="bg-white min-h-[500px] w-full relative z-20 pb-20">
          {/* White Extension to cover gaps if any */}
          <div className="absolute top-0 left-0 w-full h-full bg-white -z-10"></div>

          <div className="container mx-auto px-6 md:px-20 pt-8">
            {/* Filters Bar */}
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              {filters.map((filter) => (
                <button
                  key={filter}
                  onClick={() => setActiveFilter(filter)}
                  className={`px-6 py-2 rounded-full border text-sm font-bold uppercase tracking-wider transition-all
                       ${
                         activeFilter === filter
                           ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/30 transform scale-105"
                           : "bg-transparent border-slate-200 text-slate-500 hover:border-blue-400 hover:text-blue-500"
                       }
                     `}
                >
                  {filter}
                </button>
              ))}
            </div>

            {/* Movies Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-10">
              {galleryMovies.map((movie, idx) => (
                <div
                  key={idx}
                  className="group relative aspect-[2/3] rounded-lg overflow-hidden shadow-lg cursor-pointer bg-black"
                >
                  {/* Image Poster */}
                  <img
                    src="https://images.unsplash.com/photo-1614726365723-49cfae927846?q=80&w=400&auto=format&fit=crop"
                    alt="Poster"
                    className="w-full h-full object-cover opacity-80 group-hover:opacity-60 transition duration-500 transform group-hover:scale-110"
                  />

                  {/* Overlay Text Effect */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <div className="text-center transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                      <h3 className="text-cyan-300 font-black text-xl md:text-2xl tracking-tighter uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] leading-none mb-1">
                        ECHOES OF
                      </h3>
                      <h3 className="text-white font-black text-xl md:text-2xl tracking-tighter uppercase drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)] leading-none">
                        TOMORROW
                      </h3>
                      <div className="mt-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <span className="text-xs text-white border border-white/50 px-2 py-1 rounded">
                          Watch Now
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Corner Tech Decor */}
                  <div className="absolute top-2 right-2 w-2 h-2 bg-cyan-400 rounded-full opacity-60"></div>
                  <div className="absolute bottom-2 left-2 text-[10px] text-white/50 font-mono">
                    ID-{idx + 10}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center gap-2 mt-20">
              <button className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center shadow-lg font-bold">
                1
              </button>
              {[2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  className="w-10 h-10 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 flex items-center justify-center transition-colors font-medium text-sm"
                >
                  {n}
                </button>
              ))}
              <span className="text-slate-300 px-2">...</span>
              <button className="w-10 h-10 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 flex items-center justify-center transition-colors font-medium text-sm">
                10
              </button>
            </div>
          </div>

          {/* Bottom Curve (Inverse) - Optional if you want the page to end with blue again */}
          <div className="absolute bottom-0 w-full h-20 bg-transparent translate-y-full">
            {/* Reserved for footer transition */}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Gallery;
