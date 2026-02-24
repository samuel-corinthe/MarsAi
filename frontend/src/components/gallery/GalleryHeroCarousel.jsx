import { Link } from "react-router-dom";

const CAROUSEL_SHIFT = "clamp(90px, 18vw, 240px)";
const CAROUSEL_POSITIONS = [
  { offset: -2, scale: 0.72, opacity: 0.35, blur: 2, z: 1 },
  { offset: -1, scale: 0.88, opacity: 0.65, blur: 1, z: 2 },
  { offset: 0, scale: 1.05, opacity: 1, blur: 0, z: 3 },
  { offset: 1, scale: 0.88, opacity: 0.65, blur: 1, z: 2 },
  { offset: 2, scale: 0.72, opacity: 0.35, blur: 2, z: 1 },
];

export default function GalleryHeroCarousel({
  showTopCarousel,
  activeTopMoviePreviewUrl,
  activeTopMovieId,
  topCarouselVideoRef,
  topMovies,
  carouselIndex,
  language,
  t,
  isLight,
}) {
  const activeCarouselPositions = CAROUSEL_POSITIONS.slice(0, topMovies.length);

  return (
    <section className="relative w-full pb-36 md:pb-40 pt-10">
      {showTopCarousel && activeTopMoviePreviewUrl && (
        <video
          key={`top-carousel-preview-${activeTopMovieId}`}
          ref={topCarouselVideoRef}
          src={activeTopMoviePreviewUrl}
          muted
          playsInline
          preload="metadata"
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      <div
        className={`absolute inset-0 ${isLight ? "bg-blue-950/45" : "bg-black/55"}`}
      />
      <div
        className={`absolute inset-0 ${
          isLight
            ? "bg-gradient-to-b from-blue-900/70 to-blue-950"
            : "bg-gradient-to-b from-slate-900/85 via-[#16182a] to-black"
        }`}
      />
      <div className="relative z-10 container mx-auto px-6 text-center">
        <h1
          className={`text-3xl md:text-5xl font-black mb-10 mt-8 tracking-tighter uppercase ${
            isLight ? "text-white" : "text-slate-100"
          }`}
        >
          {language === "fr" ? "Decouvrez " : "Discover "}
          <span className={isLight ? "text-cyan-400" : "text-fuchsia-300"}>
            {t("gallery.title_accent", "nos Merveilles")}
          </span>
        </h1>

        {showTopCarousel && topMovies.length > 0 && (
          <div className="mt-6 md:mt-10">
            <p
              className={`font-black uppercase tracking-widest text-xs md:text-sm mb-6 ${
                isLight ? "text-white/90" : "text-slate-300"
              }`}
            >
              {t(
                "gallery.top_movies_subtitle",
                "Decouvrez les 5 meilleurs films",
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
                      transform: `translate(-50%, -50%) translateX(calc(${pos.offset} * ${CAROUSEL_SHIFT})) scale(${pos.scale})`,
                      opacity: pos.opacity,
                      filter: `blur(${pos.blur}px)`,
                      zIndex: pos.z,
                    }}
                  >
                    <div
                      className={`group relative aspect-[16/9] rounded-[28px] overflow-hidden shadow-2xl ${
                        isLight
                          ? "bg-blue-950/80 border border-white/10"
                          : "bg-slate-900/85 border border-slate-500/45"
                      }`}
                    >
                      <img
                        src={movie.img}
                        alt={movie.title}
                        className="w-full h-full object-cover opacity-95 group-hover:opacity-40 transition-all duration-700"
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div
                          className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                            isLight ? "bg-white text-blue-950" : "bg-fuchsia-200 text-slate-900"
                          }`}
                        >
                          <svg
                            className="w-6 h-6 ml-1"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
                          </svg>
                        </div>
                      </div>
                      <div
                        className={`absolute bottom-3 left-0 right-0 px-4 text-sm font-black uppercase text-center opacity-0 group-hover:opacity-100 transition-opacity ${
                          isLight ? "text-white" : "text-slate-100"
                        }`}
                      >
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
  );
}
