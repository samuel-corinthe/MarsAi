import React, { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Seo from "../components/Seo";
import { MovieSchema, BreadcrumbSchema } from "../components/Schema";
import MascotCameraPlayer from "../components/MascotCameraPlayer";
import SocialIcon from "../components/ui/SocialIcon";
import { useTheme } from "../context/ThemeContext";
import {
  getLocalizedMoviePath,
  getLocalizedPath,
  normalizeLanguage,
} from "../utils/localizedRoutes";
import {
  deleteMyMovieRating,
  getCurrentSessionUser,
  getMovieById,
  getMyMovieRating,
  getSitePhaseState,
  upsertMyMovieRating,
} from "../api";

const SOCIAL_LINK_ORDER = [
  { key: "instagram", label: "Instagram" },
  { key: "facebook", label: "Facebook" },
  { key: "x", label: "X" },
  { key: "youtube", label: "YouTube" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "website", label: "Website" },
];
const HERO_PREVIEW_SECONDS = 5;

function toExternalUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  return `https://${raw}`;
}

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

function toNonEmptyString(...values) {
  for (const value of values) {
    if (value == null) continue;
    const normalized = String(value).trim();
    if (normalized) return normalized;
  }
  return "";
}

function toDurationDisplay(value, fallbackLabel) {
  if (value == null) return fallbackLabel;

  if (typeof value === "string") {
    const raw = value.trim();
    if (!raw) return fallbackLabel;
    if (/[a-zA-Z]/.test(raw)) return raw;
    const numeric = Number(raw);
    if (!Number.isFinite(numeric) || numeric <= 0) return fallbackLabel;
    return `${Math.round(numeric)}min`;
  }

  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) return fallbackLabel;
  return `${Math.round(numeric)}min`;
}

function extractDurationMinutes(value) {
  if (value == null) return undefined;

  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.round(value);
  }

  const raw = String(value).trim();
  if (!raw) return undefined;

  const match = raw.match(/(\d+)/);
  if (!match) return undefined;

  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function toYoutubeEmbedUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directIdMatch = raw.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directIdMatch) {
    return `https://www.youtube.com/embed/${directIdMatch[0]}`;
  }

  try {
    const url = new URL(raw);
    const host = String(url.hostname || "").toLowerCase();
    const pathname = String(url.pathname || "");

    if (host.includes("youtu.be")) {
      const id = pathname.replace(/^\/+/, "").split("/")[0];
      if (id) return `https://www.youtube.com/embed/${id}`;
    }

    if (host.includes("youtube.com")) {
      if (pathname.startsWith("/embed/")) return raw;
      const v = url.searchParams.get("v");
      if (v) return `https://www.youtube.com/embed/${v}`;
    }
  } catch {
    return "";
  }

  return "";
}

function toDirectPreviewVideoUrl(...values) {
  for (const value of values) {
    const raw = String(value || "").trim();
    if (!raw) continue;
    if (/^https?:\/\/s3\.[^/]+\.scw\.cloud\/.+/i.test(raw)) return raw;
    if (/^https?:\/\/[^?#]+\.(mp4)(?:[?#].*)?$/i.test(raw)) return raw;
    if (/^\/(?:MarsAi\/)?uploads\/videos\/[^?#]+\.(mp4)(?:[?#].*)?$/i.test(raw)) return raw;
  }
  return "";
}

function toSafeDownloadFileName(title) {
  const base = String(title || "film")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${base || "film"}.mp4`;
}

function buildMovieDownloadPath(movieId) {
  if (!Number.isFinite(Number(movieId)) || Number(movieId) <= 0) {
    return "";
  }
  if (typeof window !== "undefined") {
    const pathname = String(window.location?.pathname || "").toLowerCase();
    if (pathname === "/marsai" || pathname.startsWith("/marsai/")) {
      return `/MarsAi/api/movies/${movieId}/download`;
    }
  }
  return `/api/movies/${movieId}/download`;
}

function getSocialEntries(movie) {
  const socialLinks = movie?.socialLinks;
  if (!socialLinks || typeof socialLinks !== "object") return [];

  const getRawLink = (entryKey) => {
    if (entryKey === "x") return socialLinks.x || socialLinks.twitter || "";
    if (entryKey === "website") return socialLinks.website || socialLinks.site || "";
    return socialLinks[entryKey];
  };

  return SOCIAL_LINK_ORDER
    .map((entry) => {
      const url = toExternalUrl(getRawLink(entry.key));
      if (!url) return null;
      return { ...entry, url };
    })
    .filter(Boolean);
}

const MovieDetails = () => {
  const { id } = useParams();
  const { t, i18n } = useTranslation();
  const { isLight } = useTheme();
  const isArabic = normalizeLanguage(i18n.language) === "ar";
  const homePath = getLocalizedPath("home", i18n.language);
  const galleryPath = getLocalizedPath("films", i18n.language);

  const [movie, setMovie] = useState(null);
  const [movieLoading, setMovieLoading] = useState(true);
  const [movieError, setMovieError] = useState("");

  const [hasSession, setHasSession] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officialRating, setOfficialRating] = useState(null);
  const [officialComment, setOfficialComment] = useState("");
  const [tempRating, setTempRating] = useState(0);
  const [tempComment, setTempComment] = useState("");
  const [ratingLoading, setRatingLoading] = useState(false);
  const [ratingError, setRatingError] = useState("");
  const [isPlayerOpen, setIsPlayerOpen] = useState(false);
  const [activeSitePhase, setActiveSitePhase] = useState("phase_1");
  const heroVideoRef = useRef(null);

  const movieId = Number.parseInt(id, 10);

  const seoTitle = movie?.title || t("movie_details.not_found");
  const seoDescription = movie?.description || t("movie_details.back_to_gallery");

  useEffect(() => {
    setIsPlayerOpen(false);
  }, [movieId]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const sitePhase = await getSitePhaseState();
        if (cancelled) return;
        setActiveSitePhase(String(sitePhase?.currentPhase || "phase_1").toLowerCase());
      } catch {
        if (!cancelled) {
          setActiveSitePhase("phase_1");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const shouldUseYoutubePlayer =
    activeSitePhase === "phase_2" || activeSitePhase === "phase_3";
  const directPlayerVideoUrl = toDirectPreviewVideoUrl(movie?.videoUrl, movie?.rawVideoUrl);
  const heroPreviewVideoUrl = directPlayerVideoUrl;

  useEffect(() => {
    const video = heroVideoRef.current;
    if (!video || !heroPreviewVideoUrl) return;

    const handleLoadedMetadata = () => {
      video.currentTime = 0;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
      }
    };

    const handleTimeUpdate = () => {
      if (video.currentTime >= HERO_PREVIEW_SECONDS) {
        video.currentTime = 0;
      }
    };

    video.addEventListener("loadedmetadata", handleLoadedMetadata);
    video.addEventListener("timeupdate", handleTimeUpdate);

    if (video.readyState >= 1) {
      handleLoadedMetadata();
    }

    return () => {
      video.removeEventListener("loadedmetadata", handleLoadedMetadata);
      video.removeEventListener("timeupdate", handleTimeUpdate);
      video.pause();
    };
  }, [heroPreviewVideoUrl]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setMovieLoading(true);
      setMovieError("");

      if (!Number.isFinite(movieId) || movieId <= 0) {
        setMovie(null);
        setMovieLoading(false);
        return;
      }

      try {
        const payload = await getMovieById(movieId);
        if (cancelled) return;
        setMovie(payload || null);
      } catch (error) {
        if (!cancelled) {
          setMovie(null);
          setMovieError(error?.message || t("movie_details.load_error"));
        }
      } finally {
        if (!cancelled) {
          setMovieLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movieId, t]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setRatingError("");
      setSessionChecked(false);
      setRatingLoading(false);

      if (!Number.isFinite(movieId) || movieId <= 0) {
        setHasSession(false);
        setIsAdmin(false);
        setOfficialRating(null);
        setOfficialComment("");
        setSessionChecked(true);
        return;
      }

      try {
        const sessionPayload = await getCurrentSessionUser();
        if (cancelled) return;

        const hasActiveSession =
          Boolean(sessionPayload?.authenticated) || Boolean(sessionPayload?.user);
        setHasSession(hasActiveSession);

        const role = String(sessionPayload?.user?.role || "").toLowerCase();
        const canRate =
          hasActiveSession &&
          (role === "admin" || role === "superadmin");
        setIsAdmin(canRate);

        if (!canRate) {
          setOfficialRating(null);
          setOfficialComment("");
          return;
        }

        setRatingLoading(true);
        try {
          const ratingPayload = await getMyMovieRating(movieId);
          if (cancelled) return;
          const myScore = Number(ratingPayload?.myScore);
          const myComment = String(ratingPayload?.myComment || "");
          setOfficialRating(Number.isFinite(myScore) ? myScore : null);
          setOfficialComment(myComment);
        } catch (error) {
          if (!cancelled) {
            setRatingError(error?.message || "Impossible de charger votre note.");
          }
        } finally {
          if (!cancelled) setRatingLoading(false);
        }
      } catch {
        if (!cancelled) {
          setHasSession(false);
          setIsAdmin(false);
          setOfficialRating(null);
          setOfficialComment("");
        }
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [movieId]);

  const openRatingModal = () => {
    if (!isAdmin || !sessionChecked || ratingLoading) return;
    setTempRating(officialRating || 0);
    setTempComment(officialComment || "");
    setIsModalOpen(true);
  };

  const handleSaveVote = async () => {
    if (!isAdmin) return;
    if (!Number.isInteger(tempRating) || tempRating < 1 || tempRating > 5) return;

    setRatingError("");
    setRatingLoading(true);
    try {
      const normalizedComment = String(tempComment || "").trim();
      await upsertMyMovieRating(movieId, tempRating, normalizedComment);
      setOfficialRating(tempRating);
      setOfficialComment(normalizedComment);
      setIsModalOpen(false);
    } catch (error) {
      setRatingError(error?.message || "Impossible d'enregistrer la note.");
    } finally {
      setRatingLoading(false);
    }
  };

  const handleDeleteVote = async () => {
    if (!isAdmin) return;

    setRatingError("");
    setRatingLoading(true);
    try {
      await deleteMyMovieRating(movieId);
      setOfficialRating(null);
      setOfficialComment("");
      setIsModalOpen(false);
    } catch (error) {
      setRatingError(error?.message || "Impossible de supprimer la note.");
    } finally {
      setRatingLoading(false);
    }
  };

  if (movieLoading) {
    return (
      <>
        <Seo
          title={t("movie_details.loading", "Chargement")}
          description={t("movie_details.back_to_gallery")}
          noIndex
        />
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isLight ? "bg-[#f4f8ff] text-slate-900" : "bg-blue-950 text-white"}`}>
          <p className="text-xl font-black uppercase tracking-widest">
            {t("movie_details.loading", "Chargement...")}
          </p>
        </div>
      </>
    );
  }

  if (!movie) {
    return (
      <>
        <Seo
          title={t("movie_details.not_found")}
          description={t("movie_details.back_to_gallery")}
          noIndex
        />
        <div className={`min-h-screen flex flex-col items-center justify-center p-6 ${isLight ? "bg-[#f4f8ff] text-slate-900" : "bg-blue-950 text-white"}`}>
          <h1 className="text-3xl font-black mb-4 uppercase tracking-tighter">
            {t("movie_details.not_found")}
          </h1>
          {movieError && (
            <p className="mb-6 text-sm text-rose-300 text-center max-w-xl">{movieError}</p>
          )}
          <Link
            to={galleryPath}
            className={`px-8 py-3 rounded-full font-bold uppercase tracking-widest transition-all ${isLight ? "bg-sky-600 text-white hover:bg-sky-500" : "bg-cyan-500 text-blue-950 hover:bg-cyan-400"}`}
          >
            {t("movie_details.back_to_gallery")}
          </Link>
        </div>
      </>
    );
  }

  const socialEntries = getSocialEntries(movie);
  const fallbackNa = t("movie_details.na");
  const directorName = toNonEmptyString(
    movie.director,
    movie.submittedBy,
    movie.submitted_by,
  ) || fallbackNa;
  const countryName = toNonEmptyString(
    movie.country,
    movie.country_name_fr,
    movie.country_name_eng,
  ) || fallbackNa;
  const countryAlpha2 = toNonEmptyString(
    movie.countryAlpha2,
    movie.country_alpha2,
  ).toLowerCase();
  const rawCountryFlagPath =
    toNonEmptyString(movie.countryFlagPath, movie.country_flag_path) ||
    (countryAlpha2 ? `/images/flags/${countryAlpha2}.png` : "");
  const countryFlagPath = toFlagAssetPath(rawCountryFlagPath);
  const releaseDateDisplay =
    toNonEmptyString(movie.releaseDate, movie.release_date, movie.release_year) || fallbackNa;
  const durationDisplay = toDurationDisplay(movie.duration, fallbackNa);
  const youtubeEmbedUrl = toYoutubeEmbedUrl(movie.youtubeUrl);
  const canWatchMovie = shouldUseYoutubePlayer
    ? Boolean(youtubeEmbedUrl)
    : Boolean(directPlayerVideoUrl);
  const downloadFileName = toSafeDownloadFileName(movie.title);
  const downloadableVideoUrl = buildMovieDownloadPath(movie.id);
  const movieSchemaDurationMinutes = extractDurationMinutes(movie.duration);
  const movieGenreList = Array.isArray(movie.genre) ? movie.genre : [];
  const breadcrumbItems = [
    {
      name: t("nav.home", "Accueil"),
      url: homePath,
    },
    {
      name: t("nav.films", "Films"),
      url: galleryPath,
    },
    {
      name: movie.title,
      url: getLocalizedMoviePath(movie.id, i18n.language),
    },
  ];
  const theme = isLight
    ? {
      page: "bg-[#f4f8ff] text-slate-900",
      nav: "border-slate-200 bg-white/90",
      backBtn:
        "border-sky-300/60 bg-sky-100 text-sky-700 hover:border-sky-400 hover:bg-sky-500 hover:text-white",
      hero: "from-sky-200 via-sky-300 to-indigo-300",
      heroOverlay: "bg-white/30",
      heroGradient: "from-white/40 via-sky-100/45 to-[#f4f8ff]",
      meta: "text-slate-700",
      watchBtn: "bg-sky-600 hover:bg-sky-500 text-white",
      disabledWatchBtn: "bg-slate-300 text-slate-600",
      panel: "bg-white text-slate-800",
      adminCard: "bg-white border border-slate-200",
      adminTitle: "text-slate-900",
      adminText: "text-slate-600",
      adminBtn: "bg-sky-600 text-white hover:bg-sky-500",
      techCard: "bg-white border border-slate-200",
      techTitle: "text-slate-900",
      modalOverlay: "bg-slate-900/70",
    }
    : {
      page: "bg-blue-950 text-white",
      nav: "border-white/10 bg-blue-950/85",
      backBtn:
        "border-cyan-300/30 bg-white/10 text-white hover:border-cyan-300 hover:bg-cyan-500 hover:text-blue-950",
      hero: "from-blue-900 to-blue-950",
      heroOverlay: "bg-blue-950/60",
      heroGradient: "from-blue-800/60 via-blue-900/75 to-blue-950",
      meta: "text-slate-300",
      watchBtn: "bg-cyan-500 hover:bg-cyan-400 text-blue-950",
      disabledWatchBtn: "bg-slate-500 text-white",
      panel: "bg-white text-slate-800",
      adminCard: "bg-blue-950 border border-white/10",
      adminTitle: "text-white",
      adminText: "text-cyan-100/90",
      adminBtn: "bg-white text-blue-950 hover:bg-cyan-400",
      techCard: "bg-slate-50 border border-slate-100",
      techTitle: "text-blue-950",
      modalOverlay: "bg-blue-950/95",
    };

  return (
    <>
      <Seo title={seoTitle} description={seoDescription} />
      <MovieSchema
        title={movie.title}
        description={movie.description || seoDescription}
        director={directorName}
        datePublished={releaseDateDisplay}
        image={movie.img}
        duration={movieSchemaDurationMinutes}
        genre={movieGenreList}
      />
      <BreadcrumbSchema items={breadcrumbItems} />
      <div
        className={`movie-details-page min-h-screen font-sans relative ${theme.page}`}
        dir={isArabic ? "rtl" : "ltr"}
      >
        <div className={`sticky top-0 z-30 border-b backdrop-blur-md ${theme.nav}`}>
          <div className="mx-auto w-full max-w-7xl px-4 py-3 sm:px-6">
            <Link
              to={galleryPath}
              className={`inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-2 text-[11px] font-black uppercase tracking-[0.15em] shadow-lg shadow-black/30 transition-all sm:text-xs ${theme.backBtn}`}
            >
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2.5"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="truncate">{t("movie_details.back_to_gallery")}</span>
            </Link>
          </div>
        </div>

        <section className={`relative w-full pt-20 md:pt-32 pb-20 overflow-hidden bg-gradient-to-b ${theme.hero}`}>
          {heroPreviewVideoUrl && (
            <video
              ref={heroVideoRef}
              className="absolute inset-0 h-full w-full object-cover"
              src={heroPreviewVideoUrl}
              muted
              playsInline
              preload="metadata"
            />
          )}
          <div className={`absolute inset-0 ${theme.heroOverlay}`} />
          <div className={`pointer-events-none absolute inset-0 bg-gradient-to-b ${theme.heroGradient}`} />
          <div className="relative z-10 container mx-auto px-6">
            <div className="flex flex-col md:flex-row gap-10 md:gap-16 items-center md:items-start">
              <div className="w-64 h-70 md:w-80 shrink-0 shadow-2xl rounded-[40px] overflow-hidden border-4 border-white/10">
                <img
                  src={movie.img}
                  alt={movie.title}
                  className="w-full h-auto object-cover aspect-[2/3]"
                />
              </div>

              <div className="flex-1 text-center md:text-left">
                <h1 className="text-5xl md:text-7xl font-black tracking-tighter mb-6 leading-none uppercase">
                  {movie.title}
                </h1>

                <div className={`flex justify-center md:justify-start items-center gap-6 font-medium mb-10 text-lg ${theme.meta}`}>
                  <span>{releaseDateDisplay}</span>
                  <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full"></span>
                  <span>{durationDisplay}</span>
                </div>

                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  {canWatchMovie ? (
                    <button
                      type="button"
                      onClick={() => setIsPlayerOpen(true)}
                      className={`inline-block font-black px-12 py-5 rounded-2xl transition-all shadow-lg shadow-cyan-500/20 mx-auto md:mx-0 uppercase tracking-widest text-sm ${theme.watchBtn}`}
                    >
                      {t("movie_details.watch_movie")}
                    </button>
                  ) : (
                    <button
                      className={`font-black px-12 py-5 rounded-2xl transition-all mx-auto md:mx-0 uppercase tracking-widest text-sm cursor-not-allowed ${theme.disabledWatchBtn}`}
                      disabled
                    >
                      {t("movie_details.watch_movie")}
                    </button>
                  )}

                  {sessionChecked && hasSession && downloadableVideoUrl && (
                    <a
                      href={downloadableVideoUrl}
                      download={downloadFileName}
                      className={`inline-flex h-[60px] w-[60px] shrink-0 items-center justify-center self-center rounded-xl border shadow-sm backdrop-blur-sm transition ${
                        isLight
                          ? "border-slate-300 bg-white/95 text-slate-700 hover:border-sky-400 hover:text-sky-700"
                          : "border-cyan-300/40 bg-slate-900/35 text-white/90 hover:border-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200"
                      }`}
                      aria-label={t("movie_details.download_movie", "Telecharger le film")}
                      title={t("movie_details.download_movie", "Telecharger le film")}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="h-6 w-6"
                        aria-hidden="true"
                      >
                        <path d="M12 3v12" />
                        <path d="m7 10 5 5 5-5" />
                        <path d="M5 21h14" />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="relative bg-white text-slate-800 rounded-t-[60px] md:rounded-t-[100px] -mt-12 z-20 pb-20">
          <div className="container mx-auto px-6 md:px-20 pt-20">
            <div className="grid lg:grid-cols-3 gap-16">
              <div className="lg:col-span-2">
                {!shouldUseYoutubePlayer && directPlayerVideoUrl && isPlayerOpen && (
                  <MascotCameraPlayer
                    src={directPlayerVideoUrl}
                    title={movie.title}
                    onClose={() => setIsPlayerOpen(false)}
                  />
                )}

                {shouldUseYoutubePlayer && youtubeEmbedUrl && isPlayerOpen && (
                  <div className="mb-12 overflow-hidden rounded-[32px] border border-slate-200 bg-white shadow-xl">
                    <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                      <p className="text-sm font-bold uppercase tracking-wider text-slate-700">
                        {t("movie_details.youtube_player")}
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsPlayerOpen(false)}
                        className="rounded-lg px-3 py-1 text-xs font-bold uppercase tracking-wider text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {t("movie_details.close_player")}
                      </button>
                    </div>
                    <div className="aspect-video w-full">
                      <iframe
                        title={`YouTube - ${movie.title}`}
                        src={youtubeEmbedUrl}
                        className="h-full w-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                        referrerPolicy="strict-origin-when-cross-origin"
                        allowFullScreen
                      />
                    </div>
                  </div>
                )}

                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-blue-600 rounded-full"></span>{" "}
                    {t("movie_details.synopsis")}
                  </h2>
                  <p className="text-xl text-slate-600 leading-relaxed font-medium">
                    {movie.description || t("movie_details.na")}
                  </p>
                </div>

                {movie.bio && (
                  <div className="mb-12">
                    <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                      <span className="w-10 h-2 bg-indigo-500 rounded-full"></span>{" "}
                      {t("movie_details.creator_bio")}
                    </h2>
                    <p className="text-lg text-slate-600 leading-relaxed font-medium">
                      {movie.bio}
                    </p>
                  </div>
                )}

                {socialEntries.length > 0 && (
                  <div className="mb-12">
                    <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                      <span className="w-10 h-2 bg-blue-500 rounded-full"></span>{" "}
                      {t("movie_details.social_links")}
                    </h2>
                    <div className="flex flex-wrap gap-3">
                      {socialEntries.map((entry) => (
                        <a
                          key={entry.key}
                          href={entry.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-bold text-blue-900 transition hover:bg-white hover:shadow-md"
                        >
                          <SocialIcon network={entry.key} className="h-4 w-4" />
                          <span>{entry.label}</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-6 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-cyan-500 rounded-full"></span>{" "}
                    {t("movie_details.ai_stack")}
                  </h2>
                  <div className="flex flex-wrap gap-3">
                    {movie.aiTools?.length > 0 ? (
                      movie.aiTools.map((tool) => (
                        <span
                          key={tool}
                          className="px-5 py-3 bg-slate-100 text-blue-900 font-bold rounded-2xl border border-slate-200 uppercase text-xs tracking-widest"
                        >
                          {tool}
                        </span>
                      ))
                    ) : (
                      <p className="text-slate-400 italic">
                        {t("movie_details.no_ai_tools")}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mb-12">
                  <h2 className="text-3xl font-black mb-8 flex items-center gap-3 uppercase tracking-tighter">
                    <span className="w-10 h-2 bg-blue-600 rounded-full"></span>{" "}
                    {t("movie_details.casting")}
                  </h2>
                  {movie.cast?.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {movie.cast.map((person, index) => (
                        <div
                          key={`${person.name || "cast"}-${index}`}
                          className="flex items-center gap-4 p-5 rounded-[30px] bg-slate-50 border border-slate-100 group hover:bg-white hover:shadow-xl transition-all"
                        >
                          <img
                            src={person.img || `https://i.pravatar.cc/150?u=cast-${movie.id}-${index}`}
                            className="w-16 h-16 rounded-2xl object-cover shadow-md"
                            alt={person.name || t("movie_details.casting")}
                          />
                          <div>
                            <p className="font-black text-blue-900 leading-tight uppercase tracking-tighter">
                              {person.name || t("movie_details.unknown_person")}
                            </p>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-wider">
                              {person.role || t("movie_details.na")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-slate-400 italic">{t("movie_details.na")}</p>
                  )}
                </div>

                {sessionChecked && isAdmin && (
                  <div className={`mt-16 p-8 rounded-[40px] flex flex-col sm:flex-row items-center justify-between gap-6 shadow-2xl ${theme.adminCard}`}>
                    <div>
                      <p className="text-cyan-400 font-bold text-xs uppercase tracking-widest mb-1">
                        {t("movie_details.admin_db_access")}
                      </p>
                      <h4 className={`font-black text-2xl uppercase tracking-tighter ${theme.adminTitle}`}>
                        {t("movie_details.admin_note")} :{" "}
                        {officialRating
                          ? `${officialRating}/5`
                          : t("movie_details.admin_not_rated")}
                      </h4>
                      <p className={`mt-2 text-sm ${theme.adminText}`}>
                        {t("movie_details.admin_comment")} :{" "}
                        {officialComment || t("movie_details.admin_no_comment")}
                      </p>
                    </div>
                    <button
                      onClick={openRatingModal}
                      className={`font-black px-10 py-4 rounded-2xl transition-all uppercase tracking-widest text-sm disabled:opacity-60 ${theme.adminBtn}`}
                      disabled={ratingLoading}
                    >
                      {ratingLoading ? "..." : t("movie_details.admin_manage_note")}
                    </button>
                  </div>
                )}
                {ratingError && (
                  <p className="mt-4 text-sm font-semibold text-rose-500">{ratingError}</p>
                )}
              </div>

              <div className={`rounded-[40px] p-8 h-fit shadow-sm ${theme.techCard}`}>
                <h3 className={`font-black mb-8 uppercase text-sm tracking-[0.2em] ${theme.techTitle}`}>
                  {t("movie_details.tech_specs")}
                </h3>
                <div className="space-y-6">
                  <DetailRow
                    label={t("movie_details.director")}
                    value={directorName}
                  />
                  <DetailRow
                    label={t("movie_details.country")}
                    value={(
                      <span className="inline-flex items-center gap-2">
                        {countryFlagPath && (
                          <img
                            src={countryFlagPath}
                            alt={`${t("upload.form.flag_alt")} ${countryName}`}
                            className="h-4 w-6 rounded-sm border border-slate-200 object-cover"
                            loading="lazy"
                          />
                        )}
                        <span>{countryName}</span>
                      </span>
                    )}
                  />
                  <DetailRow
                    label={t("movie_details.release_date")}
                    value={releaseDateDisplay}
                  />
                  <DetailRow
                    label={t("movie_details.duration")}
                    value={durationDisplay}
                    last
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {sessionChecked && isAdmin && isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
              className={`absolute inset-0 backdrop-blur-md ${theme.modalOverlay}`}
              onClick={() => setIsModalOpen(false)}
            ></div>
            <div className="relative bg-white rounded-[50px] p-12 w-full max-w-sm shadow-2xl text-center">
              <h3 className="text-3xl font-black text-blue-950 mb-8 uppercase tracking-tighter italic">
                {t("movie_details.modal_title")}
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
              <div className="mb-6 text-left">
                <label className="mb-2 block text-xs font-black uppercase tracking-widest text-slate-500">
                  {t("movie_details.modal_comment_label")}
                </label>
                <textarea
                  value={tempComment}
                  onChange={(event) => setTempComment(event.target.value)}
                  maxLength={2000}
                  rows={4}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white"
                  placeholder={t("movie_details.modal_comment_placeholder")}
                />
              </div>
              <div className="flex flex-col gap-4">
                <button
                  onClick={handleSaveVote}
                  className="w-full py-5 bg-blue-950 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-blue-800 transition-all disabled:opacity-60"
                  disabled={ratingLoading || tempRating < 1 || tempRating > 5}
                >
                  {ratingLoading ? "..." : t("movie_details.modal_confirm")}
                </button>
                {officialRating && (
                  <button
                    onClick={handleDeleteVote}
                    className="text-red-500 font-bold uppercase text-xs tracking-widest py-2 disabled:opacity-60"
                    disabled={ratingLoading}
                  >
                    {t("movie_details.modal_delete")}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

const DetailRow = ({ label, value, isStar, last }) => (
  <div
    className={`flex flex-col ${!last ? "border-b border-slate-200 pb-4" : ""}`}
  >
    <span className="text-[10px] uppercase font-black text-slate-400 tracking-widest mb-1">
      {label}
    </span>
    <span className="font-bold text-blue-900 uppercase flex items-center gap-2">
      {isStar && <span className="text-yellow-500 text-lg">&#9733;</span>}
      {value}
    </span>
  </div>
);

export default MovieDetails;

