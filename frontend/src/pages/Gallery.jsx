import React, { useState, useRef, useEffect, useCallback } from "react";
import { Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { BreadcrumbSchema } from "../components/Schema";
import GalleryFilterModal from "../components/gallery/GalleryFilterModal";
import GalleryHeroCarousel from "../components/gallery/GalleryHeroCarousel";
import GalleryMovieCard from "../components/gallery/GalleryMovieCard";
import GalleryPagination from "../components/gallery/GalleryPagination";
import GallerySearchToolbar from "../components/gallery/GallerySearchToolbar";
import PageLoader from "../components/ui/PageLoader";
import { useTheme } from "../context/ThemeContext";
import { withDeploymentBase } from "../utils/deploymentPath";
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
  return withDeploymentBase(raw);
}

function toDirectPreviewVideoUrl(...values) {
  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    if (/^https?:\/\/s3\.[^/]+\.scw\.cloud\/.+/i.test(raw)) return raw;
    if (/^https?:\/\/[^?#]+\.(mp4)(?:[?#].*)?$/i.test(raw)) return raw;
    if (/^\/(?:(?:MarsAi|MarsAiFestival)\/)?uploads\/videos\/[^?#]+\.(mp4)(?:[?#].*)?$/i.test(raw)) return raw;
  }
  return "";
}

const Gallery = () => {
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
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
          rawVideoUrl: String(movie?.rawVideoUrl || movie?.videoUrl || "").trim(),
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
  const highlightedPositionIndex = Math.max(
    0,
    Math.min(2, Math.max(0, topMovies.length - 1)),
  );
  const activeTopMovie =
    topMovies.length > 0
      ? topMovies[(carouselIndex + highlightedPositionIndex) % topMovies.length]
      : null;
  const activeTopMoviePreviewUrl = toDirectPreviewVideoUrl(
    activeTopMovie?.videoUrl,
    activeTopMovie?.rawVideoUrl,
  );

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
    if (!video || !activeTopMoviePreviewUrl) return;

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
  }, [showTopCarousel, activeTopMovie?.id, activeTopMoviePreviewUrl]);

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
    return <PageLoader message={t("ui.loading_gallery_access", "Checking gallery access...")} />;
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
      <div
        className={`min-h-screen flex flex-col font-sans ${
          isLight ? "bg-[#07163a] text-slate-100" : "bg-[#05060f] text-slate-100"
        }`}
      >
        <GalleryHeroCarousel
          showTopCarousel={showTopCarousel}
          activeTopMoviePreviewUrl={activeTopMoviePreviewUrl}
          activeTopMovieId={activeTopMovie?.id}
          topCarouselVideoRef={topCarouselVideoRef}
          topMovies={topMovies}
          carouselIndex={carouselIndex}
          language={i18n.language}
          t={t}
          isLight={isLight}
        />

        <section className="relative flex-grow">
          <div className={`absolute -top-20 left-0 w-full h-20 ${isLight ? "bg-[#05060f]" : "bg-[#05060f]"}`}>
            <div
              className={`w-full h-full rounded-tl-[80px] md:rounded-tl-[120px] ${
                isLight ? "bg-[#e7f1ff]" : "bg-slate-900"
              }`}
            ></div>
          </div>

          <div
            className={`min-h-[500px] w-full relative z-20 pb-20 ${
              isLight ? "bg-[#e7f1ff]" : "bg-slate-900"
            }`}
          >
            <div className="container mx-auto px-6 md:px-20 pt-8">
              <div className="flex flex-col items-center gap-8 mb-16">
                <GallerySearchToolbar
                  searchRef={searchRef}
                  isLight={isLight}
                  searchQuery={searchQuery}
                  onSearchQueryChange={(value) => {
                    setSearchQuery(value);
                    setShowSuggestions(true);
                  }}
                  onSearchFocus={() => setShowSuggestions(true)}
                  showSuggestions={showSuggestions}
                  suggestions={suggestions}
                  onSuggestionClick={() => setShowSuggestions(false)}
                  onOpenFilters={() => setIsFilterModalOpen(true)}
                  sortBy={sortBy}
                  minRating={minRating}
                  maxRating={maxRating}
                  activeSortLabel={activeSortLabel}
                  onResetSort={() => setSortBy("default")}
                  onResetRating={() => {
                    setMinRating(0);
                    setMaxRating(5);
                  }}
                  canManagePhaseSelection={canManagePhaseSelection}
                  canManagePhase2Selection={canManagePhase2Selection}
                  phase2SelectedCount={phase2SelectedCount}
                  phaseSelectionMinRequired={phaseSelectionMinRequired}
                  phase2SelectionError={phase2SelectionError}
                  t={t}
                />

              </div>

              {moviesLoading ? (
                <PageLoader
                  fullscreen={false}
                  compact
                  message={t("gallery.loading", "Chargement des films...")}
                />
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
                      <GalleryMovieCard
                        key={movie.id}
                        movie={movie}
                        isLight={isLight}
                        flagSrc={flagSrc}
                        flagAlt={flagAlt}
                        canManagePhaseSelection={canManagePhaseSelection}
                        isSelectionDisabled={isSelectionDisabled}
                        isSelectionBusy={isSelectionBusy}
                        isSelectedForPhase2={isSelectedForPhase2}
                        isQuotaReachedForAdd={isQuotaReachedForAdd}
                        canManagePhase2Selection={canManagePhase2Selection}
                        onToggleSelection={() =>
                          handleTogglePhase2Selection(movieId, isSelectedForPhase2)
                        }
                      />
                    );
                  })}
                </div>
              ) : (
                <div className={`py-20 text-center font-black uppercase tracking-widest text-xl ${isLight ? "text-slate-500" : "text-slate-400"}`}>
                  {t("gallery.no_results", "Aucun resultat trouve")}
                </div>
              )}

              {!moviesLoading && !moviesError && (
                <GalleryPagination
                  totalPages={totalPages}
                  currentPage={currentPage}
                  onPageChange={setCurrentPage}
                />
              )}
            </div>
          </div>
        </section>
      </div>

      <GalleryFilterModal
        isOpen={isFilterModalOpen}
        isLight={isLight}
        onClose={() => setIsFilterModalOpen(false)}
        sortOptions={sortOptions}
        sortBy={sortBy}
        onSortChange={setSortBy}
        minRating={minRating}
        maxRating={maxRating}
        onMinRatingChange={(nextMin) => {
          setMinRating(nextMin);
          if (nextMin > maxRating) setMaxRating(nextMin);
        }}
        onMaxRatingChange={(nextMax) => {
          setMaxRating(nextMax);
          if (nextMax < minRating) setMinRating(nextMax);
        }}
        onReset={resetAdvancedFilters}
      />
    </>
  );
};

export default Gallery;
