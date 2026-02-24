import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { BreadcrumbSchema } from "../components/Schema";
import {
  getCurrentSessionUser,
  getMovies,
  getPhase2SelectionStatus,
  getPhase3SelectionStatus,
  getPhase3WinnersPublic,
  getSitePhaseState,
  patchPhase2Selection,
  patchPhase3Selection,
} from "../api";

const TOP_CAROUSEL_PREVIEW_SECONDS = 5;
const TOP_CAROUSEL_ROTATION_MS = 5200;

function toFlagAssetPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\/MarsAi\//i.test(raw)) return raw;

  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  if (typeof window !== "undefined") {
    const pathname = String(window.location?.pathname || "").toLowerCase();
    if (pathname === "/marsai" || pathname.startsWith("/marsai/")) {
      return `/MarsAi${withLeadingSlash}`;
    }
  }

  return withLeadingSlash;
}

const Gallery = () => {
  const { t, i18n } = useTranslation();
  const [movies, setMovies] = useState([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [moviesError, setMoviesError] = useState("");
  const [accessLoading, setAccessLoading] = useState(true);
  const [isGalleryAllowed, setIsGalleryAllowed] = useState(true);
  const [sessionUser, setSessionUser] = useState(null);
  const [activeSitePhase, setActiveSitePhase] = useState("phase_1");
  const [phase2SelectedMovieIds, setPhase2SelectedMovieIds] = useState(() => new Set());
  const [phase3EligibleMovieIds, setPhase3EligibleMovieIds] = useState(() => new Set());
  const [phase3EligibilityLoaded, setPhase3EligibilityLoaded] = useState(false);
  const [phase3WinnerMovieIds, setPhase3WinnerMovieIds] = useState(() => new Set());
  const [phase3WinnerMoviesPreview, setPhase3WinnerMoviesPreview] = useState([]);
  const [phase2SelectionMinRequired, setPhase2SelectionMinRequired] = useState(50);
  const [phase2SelectionBusyMovieId, setPhase2SelectionBusyMovieId] = useState(null);
  const [phase2SelectionError, setPhase2SelectionError] = useState("");
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("default");
  const [minRating, setMinRating] = useState(0);
  const [maxRating, setMaxRating] = useState(5);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [carouselIndex, setCarouselIndex] = useState(0);
  const searchRef = useRef(null);
  const topCarouselVideoRef = useRef(null);
  const sortOptions = [
    { label: "Defaut", value: "default" },
    { label: "Titre A-Z", value: "title_asc" },
    { label: "Titre Z-A", value: "title_desc" },
    { label: "Annee - +", value: "year_asc" },
    { label: "Annee + -", value: "year_desc" },
  ];

  const pageSize = 20;
  const sessionRole = String(sessionUser?.role || "").toLowerCase();
  const hasAdminSession = ["admin", "superadmin"].includes(sessionRole);
  const canManagePhase2Selection =
    activeSitePhase === "phase_1" && hasAdminSession;
  const canManagePhase3Selection =
    activeSitePhase === "phase_2" && hasAdminSession;
  const canManagePhaseSelection = canManagePhase2Selection || canManagePhase3Selection;
  const phase3EligibilityEnforced = phase3EligibilityLoaded && phase3EligibleMovieIds.size >= 50;

  const toMovieIdSet = useCallback((list) =>
    new Set(
      (Array.isArray(list) ? list : [])
        .map((movie) => Number(movie?.id))
        .filter((movieId) => Number.isFinite(movieId) && movieId > 0),
    ), []);

  const applyPhase2SelectionSnapshot = useCallback((payload, fallbackMinRequired = 50) => {
    const selectedMovies = Array.isArray(payload?.selectedMovies) ? payload.selectedMovies : [];
    setPhase2SelectedMovieIds(toMovieIdSet(selectedMovies));
    setPhase2SelectionMinRequired(Number(payload?.minRequired ?? fallbackMinRequired));
  }, [toMovieIdSet]);

  const applyPhase3EligibilitySnapshot = useCallback((payload) => {
    setPhase3EligibleMovieIds(toMovieIdSet(payload?.selectedMovies));
  }, [toMovieIdSet]);

  const applyPhase3WinnersSnapshot = useCallback((payload) => {
    const selectedMovies = Array.isArray(payload?.selectedMovies) ? payload.selectedMovies : [];
    setPhase3WinnerMovieIds(toMovieIdSet(selectedMovies));
    setPhase3WinnerMoviesPreview(
      selectedMovies
        .map((movie) => ({
          id: Number(movie?.id),
          title: String(movie?.title || "Sans titre"),
          img: String(movie?.posterUrl || "").trim(),
          videoUrl: String(movie?.videoUrl || "").trim(),
        }))
        .filter((movie) => Number.isFinite(movie.id) && movie.id > 0),
    );
  }, [toMovieIdSet]);

  const phase2SelectedCount = phase2SelectedMovieIds.size;
  const phaseSelectionMinRequired = canManagePhase3Selection ? 5 : phase2SelectionMinRequired;
  const showTopCarousel = activeSitePhase === "phase_3";
  const phase3WinnerMovies = movies.filter((movie) =>
    phase3WinnerMovieIds.has(Number(movie?.id)),
  );
  const topMovies =
    showTopCarousel && phase3WinnerMoviesPreview.length > 0
      ? phase3WinnerMoviesPreview.slice(0, 5)
      : showTopCarousel && phase3WinnerMovies.length > 0
        ? phase3WinnerMovies.slice(0, 5)
      : movies.slice(0, 5);
  const carouselShift = "clamp(90px, 18vw, 240px)";
  const carouselPositions = [
    { offset: -2, scale: 0.72, opacity: 0.35, blur: 2, z: 1 },
    { offset: -1, scale: 0.88, opacity: 0.65, blur: 1, z: 2 },
    { offset: 0, scale: 1.05, opacity: 1, blur: 0, z: 3 },
    { offset: 1, scale: 0.88, opacity: 0.65, blur: 1, z: 2 },
    { offset: 2, scale: 0.72, opacity: 0.35, blur: 2, z: 1 },
  ];
  const activeCarouselPositions = carouselPositions.slice(0, topMovies.length);
  const highlightedPositionIndex = activeCarouselPositions.reduce(
    (bestIndex, current, index, allPositions) =>
      current.scale > allPositions[bestIndex].scale ? index : bestIndex,
    0,
  );
  const activeTopMovie =
    topMovies.length > 0
      ? topMovies[(carouselIndex + highlightedPositionIndex) % topMovies.length]
      : null;

  const suggestions = movies
    .filter((movie) => searchQuery.length > 0 && String(movie.title || "")
      .toLowerCase()
      .includes(searchQuery.toLowerCase()))
    .slice(0, 5);
  const totalPages = Math.max(1, Number(serverTotalPages || 1));
  const paginatedMovies = movies;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setAccessLoading(true);
      setPhase2SelectionError("");

      try {
        const sitePhase = await getSitePhaseState();
        if (cancelled) return;

        const phaseKey = String(sitePhase?.currentPhase || "phase_1").toLowerCase();
        setActiveSitePhase(phaseKey);

        let mePayload = null;
        try {
          mePayload = await getCurrentSessionUser();
        } catch {
          mePayload = null;
        }

        if (cancelled) return;
        const user = mePayload?.user || null;
        setSessionUser(user);

        const role = String(user?.role || "").toLowerCase();
        const hasAdminSession = role === "admin" || role === "superadmin";

        if (phaseKey === "phase_1" && !hasAdminSession) {
          setIsGalleryAllowed(false);
          setMovies([]);
          return;
        }

        setIsGalleryAllowed(true);

        if (phaseKey === "phase_1" && hasAdminSession) {
          setPhase3EligibilityLoaded(false);
          try {
            const selection = await getPhase2SelectionStatus();
            if (!cancelled) {
              applyPhase2SelectionSnapshot(selection, 50);
              setPhase3EligibleMovieIds(new Set());
              setPhase3WinnerMovieIds(new Set());
              setPhase3WinnerMoviesPreview([]);
            }
          } catch {
            if (!cancelled) {
              setPhase2SelectedMovieIds(new Set());
              setPhase2SelectionMinRequired(50);
            }
          }
        } else if (phaseKey === "phase_2" && hasAdminSession) {
          setPhase2SelectionMinRequired(5);
          const [phase2PoolResult, phase3SelectionResult] = await Promise.allSettled([
            getPhase2SelectionStatus(),
            getPhase3SelectionStatus(),
          ]);

          if (!cancelled && phase2PoolResult.status === "fulfilled") {
            applyPhase3EligibilitySnapshot(phase2PoolResult.value);
            setPhase3EligibilityLoaded(true);
          } else if (!cancelled) {
            setPhase3EligibleMovieIds(new Set());
            setPhase3EligibilityLoaded(false);
          }

          if (!cancelled && phase3SelectionResult.status === "fulfilled") {
            applyPhase2SelectionSnapshot(phase3SelectionResult.value, 5);
            applyPhase3WinnersSnapshot(phase3SelectionResult.value);
          } else if (!cancelled) {
            setPhase2SelectedMovieIds(new Set());
            setPhase2SelectionMinRequired(5);
            setPhase3WinnerMoviesPreview([]);
          }

          if (
            !cancelled
            && phase2PoolResult.status !== "fulfilled"
            && phase3SelectionResult.status !== "fulfilled"
          ) {
            setPhase2SelectionError("");
          }
        } else if (phaseKey === "phase_3") {
          setPhase2SelectedMovieIds(new Set());
          setPhase2SelectionMinRequired(5);
          setPhase3EligibleMovieIds(new Set());
          setPhase3EligibilityLoaded(false);

          try {
            const winners = await getPhase3WinnersPublic();
            if (!cancelled) {
              applyPhase3WinnersSnapshot(winners);
            }
          } catch {
            if (!cancelled) {
              setPhase3WinnerMovieIds(new Set());
              setPhase3WinnerMoviesPreview([]);
            }
          }
        } else if (!cancelled) {
          setPhase2SelectedMovieIds(new Set());
          setPhase2SelectionMinRequired(phaseKey === "phase_2" ? 5 : 50);
          setPhase3EligibleMovieIds(new Set());
          setPhase3EligibilityLoaded(false);
          setPhase3WinnerMovieIds(new Set());
          setPhase3WinnerMoviesPreview([]);
        }
      } catch (error) {
        if (cancelled) return;
        setIsGalleryAllowed(true);
        setMoviesError(error?.message || "Impossible de verifier l'acces galerie.");
      } finally {
        if (!cancelled) {
          setAccessLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [applyPhase2SelectionSnapshot, applyPhase3EligibilitySnapshot, applyPhase3WinnersSnapshot]);

  useEffect(() => {
    if (accessLoading || !isGalleryAllowed) return;

    let cancelled = false;

    (async () => {
      setMoviesLoading(true);
      setMoviesError("");

      try {
        const payload = await getMovies({
          page: currentPage,
          pageSize,
          search: searchQuery,
          sortBy,
          minRating,
          maxRating,
        });
        if (cancelled) return;
        const rows = Array.isArray(payload?.movies) ? payload.movies : [];
        const nextTotalPages = Math.max(1, Number(payload?.pagination?.totalPages || 1));
        const nextPage = Math.max(1, Number(payload?.pagination?.page || currentPage));

        setMovies(rows);
        setServerTotalPages(nextTotalPages);
        if (nextPage !== currentPage) {
          setCurrentPage(nextPage);
        }
      } catch (error) {
        if (!cancelled) {
          setMovies([]);
          setServerTotalPages(1);
          setMoviesError(error?.message || "Impossible de charger la galerie.");
        }
      } finally {
        if (!cancelled) {
          setMoviesLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessLoading, isGalleryAllowed, currentPage, searchQuery, sortBy, minRating, maxRating]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortBy, minRating, maxRating]);

  useEffect(() => {
    document.body.style.overflow = isFilterModalOpen ? "hidden" : "unset";
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isFilterModalOpen]);

  useEffect(() => {
    if (!showTopCarousel) {
      setCarouselIndex(0);
      return;
    }
    if (topMovies.length === 0) {
      setCarouselIndex(0);
      return;
    }
    setCarouselIndex((prev) => prev % topMovies.length);
  }, [showTopCarousel, topMovies.length]);

  useEffect(() => {
    if (!showTopCarousel) return;
    if (topMovies.length <= 1) return;
    const id = setInterval(() => {
      setCarouselIndex((prev) => (prev + 1) % topMovies.length);
    }, TOP_CAROUSEL_ROTATION_MS);
    return () => clearInterval(id);
  }, [showTopCarousel, topMovies.length]);

  useEffect(() => {
    if (!showTopCarousel) return;
    const video = topCarouselVideoRef.current;
    if (!video || !activeTopMovie?.videoUrl) return;

    const restartPreview = () => {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    const handleLoadedMetadata = () => {
      restartPreview();
    };

    const handleTimeUpdate = () => {
      const duration = Number.isFinite(video.duration) ? video.duration : 0;
      const previewLimit = duration > 0
        ? Math.min(TOP_CAROUSEL_PREVIEW_SECONDS, duration)
        : TOP_CAROUSEL_PREVIEW_SECONDS;
      if (video.currentTime >= Math.max(0.2, previewLimit - 0.05)) {
        video.currentTime = 0;
      }
    };

    const handleEnded = () => {
      restartPreview();
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);
    video.addEventListener("ended", handleEnded);

    if (video.readyState >= 1) {
      restartPreview();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.removeEventListener("ended", handleEnded);
      video.pause();
      video.currentTime = 0;
    };
  }, [showTopCarousel, activeTopMovie?.id, activeTopMovie?.videoUrl]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTogglePhase2Selection = async (movieId, currentSelected) => {
    if (!canManagePhaseSelection) return;

    const safeMovieId = Number(movieId);
    if (!Number.isFinite(safeMovieId) || safeMovieId <= 0) return;
    if (!currentSelected && phase2SelectedCount >= phaseSelectionMinRequired) {
      setPhase2SelectionError(
        `Quota atteint: ${phase2SelectedCount}/${phaseSelectionMinRequired}. Retire un film avant d'en ajouter un autre.`,
      );
      return;
    }
    if (
      canManagePhase3Selection
      && phase3EligibilityEnforced
      && !currentSelected
      && !phase3EligibleMovieIds.has(safeMovieId)
    ) {
      setPhase2SelectionError(
        "Ce film n'est pas dans la selection phase 2 et ne peut pas etre promu en phase 3.",
      );
      return;
    }

    setPhase2SelectionError("");
    setPhase2SelectionBusyMovieId(safeMovieId);

    try {
      const payload = canManagePhase2Selection
        ? await patchPhase2Selection(safeMovieId, !currentSelected)
        : await patchPhase3Selection(safeMovieId, !currentSelected);
      applyPhase2SelectionSnapshot(payload);
      if (canManagePhase3Selection) {
        applyPhase3WinnersSnapshot(payload);
      }
    } catch (error) {
      setPhase2SelectionError(
        error?.message || "Impossible de modifier la selection en cours.",
      );
    } finally {
      setPhase2SelectionBusyMovieId(null);
    }
  };

  if (accessLoading) {
    return (
      <div className="min-h-screen bg-blue-950 flex items-center justify-center text-white font-black uppercase tracking-widest">
        Verification des acces galerie...
      </div>
    );
  }

  if (!isGalleryAllowed) {
    const callForProjectPath = i18n.language === "en" ? "/call-for-project" : "/appel-a-projet";
    return <Navigate to={callForProjectPath} replace />;
  }

  const seoTitle = t("nav.films", "Films");
  const seoDescription = t(
    "gallery.top_movies_subtitle",
    "Decouvrez les films selectionnes du festival marsAI.",
  );
  const breadcrumbItems = [
    {
      name: i18n.language === "en" ? "Home" : "Accueil",
      url: i18n.language === "en" ? "/home" : "/accueil",
    },
    {
      name: t("nav.films", "Films"),
      url: i18n.language === "en" ? "/movies" : "/films",
    },
  ];
  const activeSortLabel =
    sortOptions.find((option) => option.value === sortBy)?.label || "Defaut";

  const resetAdvancedFilters = () => {
    setSortBy("default");
    setMinRating(0);
    setMaxRating(5);
    setSearchQuery("");
  };

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <BreadcrumbSchema items={breadcrumbItems} />
      <div className="min-h-screen bg-blue-950 flex flex-col font-sans text-slate-800">
        <section className="relative w-full pb-36 md:pb-40 pt-10">
          {showTopCarousel && activeTopMovie?.videoUrl && (
            <video
              key={`top-carousel-preview-${activeTopMovie.id}`}
              ref={topCarouselVideoRef}
              src={activeTopMovie.videoUrl}
              muted
              playsInline
              preload="metadata"
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}
          <div className="absolute inset-0 bg-blue-950/45"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-blue-900/70 to-blue-950"></div>
          <div className="relative z-10 container mx-auto px-6 text-center">
            <h1 className="text-3xl md:text-5xl font-black text-white mb-10 mt-8 tracking-tighter uppercase">
              {i18n.language === "fr" ? "Decouvrez " : "Discover "}
              <span className="text-cyan-400">
                {t("gallery.title_accent", "nos Merveilles")}
              </span>
            </h1>

            {showTopCarousel && topMovies.length > 0 && (
              <div className="mt-6 md:mt-10">
                <p className="text-white/90 font-black uppercase tracking-widest text-xs md:text-sm mb-6">
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

        <section className="relative flex-grow">
          <div className="absolute -top-20 left-0 w-full h-20 bg-blue-950">
            <div className="w-full h-full bg-white rounded-tl-[80px] md:rounded-tl-[120px]"></div>
          </div>

          <div className="bg-white min-h-[500px] w-full relative z-20 pb-20">
            <div className="container mx-auto px-6 md:px-20 pt-8">
              <div className="flex flex-col items-center gap-8 mb-16">
              <div className="w-full max-w-2xl">
                <div className="flex items-center gap-3">
                  <div className="relative flex-grow" ref={searchRef}>
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
                            </div>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => setIsFilterModalOpen(true)}
                    className="h-[68px] min-w-[68px] rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-300/40 hover:bg-blue-700 transition-colors"
                    aria-label="Ouvrir les filtres avances"
                    title="Filtres avances"
                  >
                    <svg
                      className="mx-auto h-6 w-6"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M4 6h16M7 12h10M10 18h4"
                      />
                    </svg>
                  </button>
                </div>

                {(sortBy !== "default" || minRating > 0 || maxRating < 5) && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sortBy !== "default" && (
                      <button
                        onClick={() => setSortBy("default")}
                        className="rounded-full bg-blue-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-blue-700 hover:bg-blue-100"
                      >
                        Tri: {activeSortLabel} x
                      </button>
                    )}
                    {(minRating > 0 || maxRating < 5) && (
                      <button
                        onClick={() => {
                          setMinRating(0);
                          setMaxRating(5);
                        }}
                        className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-700 hover:bg-amber-100"
                      >
                        Note {minRating}-{maxRating} x
                      </button>
                    )}
                  </div>
                )}
                {canManagePhaseSelection && (
                  <div className="mt-4 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs font-black uppercase tracking-wider text-blue-900">
                    {canManagePhase2Selection ? "Selection phase 2" : "Selection jury phase 3"}: {phase2SelectedCount}/{phaseSelectionMinRequired}
                  </div>
                )}
                {phase2SelectionError && (
                  <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700">
                    {phase2SelectionError}
                  </div>
                )}
              </div>

              </div>

              {moviesLoading ? (
                <div className="py-20 text-center text-slate-500 font-black uppercase tracking-widest text-xl">
                  {t("gallery.loading", "Chargement des films...")}
                </div>
              ) : moviesError ? (
                <div className="py-20 text-center text-rose-500 font-black uppercase tracking-widest text-xl">
                  {moviesError}
                </div>
              ) : paginatedMovies.length > 0 ? (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 md:gap-12">
                  {paginatedMovies.map((movie) => {
                    const countryCode = String(
                      movie.countryCode || movie.countryAlpha2 || "",
                    ).trim().toLowerCase();
                    const fallbackFlagPath = countryCode
                      ? `/images/flags/${countryCode}.png`
                      : "";
                    const flagSrc = toFlagAssetPath(
                      movie.countryFlagPath || fallbackFlagPath,
                    );
                    const flagAlt = countryCode ? countryCode.toUpperCase() : (movie.country || "pays");
                    const movieId = Number(movie.id);
                    const isSelectedForPhase2 = phase2SelectedMovieIds.has(movieId);
                    const isSelectionBusy = Number(phase2SelectionBusyMovieId) === movieId;
                    const isEligibleForPhase3 =
                      !canManagePhase3Selection
                      || !phase3EligibilityEnforced
                      || phase3EligibleMovieIds.has(movieId);
                    const isQuotaReachedForAdd =
                      !isSelectedForPhase2
                      && phase2SelectedCount >= phaseSelectionMinRequired;
                    const isSelectionDisabled =
                      isQuotaReachedForAdd
                      || (canManagePhase3Selection && !isSelectedForPhase2 && !isEligibleForPhase3);

                    return (
                      <div key={movie.id} className="group space-y-3">
                        <Link to={`/movie/${movie.id}`} className="block">
                          <div className="relative aspect-video rounded-[30px] overflow-hidden shadow-xl bg-slate-100 mb-5 border border-slate-50">
                            <img
                              src={movie.img}
                              alt={movie.title}
                              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                          </div>
                          <div className="px-2">
                            <h4 className="text-blue-950 font-black text-sm uppercase truncate mb-1 tracking-tight">
                              {movie.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              {flagSrc ? (
                                <img
                                  src={flagSrc}
                                  className="w-5 h-3.5 object-cover rounded-[2px] shadow-sm border border-slate-200"
                                  alt={flagAlt}
                                  onError={(event) => {
                                    event.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <div className="w-5 h-3.5 bg-slate-100 rounded-[2px]" />
                              )}
                              <p className="text-slate-400 text-[10px] font-black uppercase truncate tracking-[0.15em]">
                                {movie.director || "Anonyme"}
                              </p>
                            </div>
                          </div>
                        </Link>
                        {canManagePhaseSelection && (
                          <button
                            type="button"
                            className={`w-full rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-colors ${
                              isSelectionDisabled
                                ? "bg-slate-200 text-slate-500 cursor-not-allowed"
                                : isSelectedForPhase2
                                ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                                : "bg-blue-100 text-blue-800 hover:bg-blue-200"
                            } disabled:opacity-60`}
                            onClick={() => handleTogglePhase2Selection(movieId, isSelectedForPhase2)}
                            disabled={isSelectionBusy || isSelectionDisabled}
                          >
                            {isSelectionBusy
                              ? "..."
                              : isSelectionDisabled
                                ? (isQuotaReachedForAdd ? "Quota atteint" : "Non retenu phase 2")
                              : isSelectedForPhase2
                                ? (canManagePhase2Selection ? "Retirer de la phase 2" : "Retirer de la phase 3")
                                : (canManagePhase2Selection ? "Selectionner pour phase 2" : "Selectionner pour phase 3")}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 text-center text-slate-300 font-black uppercase tracking-widest text-xl">
                  {t("gallery.no_results", "Aucun resultat trouve")}
                </div>
              )}

              {totalPages > 1 && !moviesLoading && !moviesError && (
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

      {isFilterModalOpen && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-blue-950/80 backdrop-blur-md"
            onClick={() => setIsFilterModalOpen(false)}
          ></div>

          <div className="relative w-full max-w-md rounded-[36px] bg-white p-8 shadow-2xl">
            <div className="mb-8 flex items-center justify-between">
              <h2 className="text-2xl font-black uppercase tracking-tight text-blue-950">
                Filtres Avances
              </h2>
              <button
                onClick={() => setIsFilterModalOpen(false)}
                className="rounded-full bg-slate-100 p-2 text-slate-500 hover:bg-slate-200"
              >
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="3"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <div className="space-y-8">
              <div>
                <p className="mb-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                  Trier par
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {sortOptions.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortBy(option.value)}
                      className={`rounded-xl py-3 text-[10px] font-black uppercase tracking-widest transition-colors ${
                        sortBy === option.value
                          ? "bg-blue-950 text-cyan-300"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                    Note (min - max)
                  </p>
                  <span className="text-sm font-black text-blue-700">
                    {minRating} - {maxRating}
                  </span>
                </div>
                <div className="space-y-3">
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Min
                    </p>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={minRating}
                      onChange={(event) => {
                        const nextMin = Number(event.target.value);
                        setMinRating(nextMin);
                        if (nextMin > maxRating) {
                          setMaxRating(nextMin);
                        }
                      }}
                      className="w-full accent-blue-600"
                    />
                  </div>
                  <div>
                    <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Max
                    </p>
                    <input
                      type="range"
                      min="0"
                      max="5"
                      step="1"
                      value={maxRating}
                      onChange={(event) => {
                        const nextMax = Number(event.target.value);
                        setMaxRating(nextMax);
                        if (nextMax < minRating) {
                          setMinRating(nextMax);
                        }
                      }}
                      className="w-full accent-blue-600"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={resetAdvancedFilters}
                className="w-full rounded-2xl border border-red-200 bg-red-50 py-3 text-xs font-black uppercase tracking-widest text-red-600 hover:bg-red-100"
              >
                Reinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Gallery;
