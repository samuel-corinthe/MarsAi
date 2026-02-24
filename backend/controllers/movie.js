import { getMovieDetails, listMovies, toMovieId } from "../services/movieService.js";
import { getPhase2SelectionStatus, getSitePhaseState } from "../services/sitePhaseService.js";
import { getSessionFromRequest } from "../services/authService.js";

const MOVIE_SORT_VALUES = new Set([
  "default",
  "title_asc",
  "title_desc",
  "year_asc",
  "year_desc",
]);
const MOVIES_PAGE_SIZE = 20;

function isAdminSession(session) {
  return ["admin", "superadmin"].includes(String(session?.role || "").toLowerCase());
}

async function enforceMovieAccessForCurrentPhase(req) {
  const sitePhase = await getSitePhaseState();
  const phaseKey = String(sitePhase?.currentPhase || "").toLowerCase();

  if (phaseKey !== "phase_1") return;

  const session = getSessionFromRequest(req);
  if (isAdminSession(session)) return;

  const error = new Error("Acces galerie reserve aux sessions admin pendant la phase 1.");
  error.statusCode = 403;
  throw error;
}

async function getVisibleMovieIdsForCurrentPhase() {
  const sitePhase = await getSitePhaseState();
  const phaseKey = String(sitePhase?.currentPhase || "").toLowerCase();

  if (phaseKey === "phase_2" || phaseKey === "phase_3") {
    const selection = await getPhase2SelectionStatus();
    const visibleIds = new Set(
      (Array.isArray(selection?.selectedMovies) ? selection.selectedMovies : [])
        .map((movie) => Number(movie?.id))
        .filter((movieId) => Number.isFinite(movieId) && movieId > 0),
    );
    return { phaseKey, visibleIds };
  }

  return { phaseKey, visibleIds: null };
}

function toPositiveInt(value, fallback, min = 1, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function toBoundedNumber(value, fallback, min = 0, max = 5) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, parsed));
}

function normalizeSortBy(value) {
  const normalized = String(value || "default").trim().toLowerCase();
  if (!MOVIE_SORT_VALUES.has(normalized)) return "default";
  return normalized;
}

function extractMovieYear(movie) {
  const releaseDate = String(movie?.releaseDate || "").trim();
  const match = releaseDate.match(/\d{4}/);
  return Number(match?.[0] || 0);
}

function filterAndSortMovies(movies, { search, sortBy, minRating, maxRating }) {
  const searchToken = String(search || "").trim().toLowerCase();
  const filtered = (Array.isArray(movies) ? movies : []).filter((movie) => {
    const movieTitle = String(movie?.title || "").toLowerCase();
    const movieDirector = String(movie?.director || "").toLowerCase();
    const movieCountry = String(movie?.country || "").toLowerCase();
    const movieRating = Number(movie?.rating || 0);

    const matchesSearch = !searchToken
      || movieTitle.includes(searchToken)
      || movieDirector.includes(searchToken)
      || movieCountry.includes(searchToken);
    const matchesRating = movieRating >= minRating && movieRating <= maxRating;

    return matchesSearch && matchesRating;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortBy === "title_asc") {
      return String(a?.title || "").localeCompare(String(b?.title || ""), "fr");
    }
    if (sortBy === "title_desc") {
      return String(b?.title || "").localeCompare(String(a?.title || ""), "fr");
    }
    if (sortBy === "year_asc") {
      return extractMovieYear(a) - extractMovieYear(b);
    }
    if (sortBy === "year_desc") {
      return extractMovieYear(b) - extractMovieYear(a);
    }
    return Number(b?.id || 0) - Number(a?.id || 0);
  });

  return sorted;
}

export async function getAllMovies(req, res) {
  try {
    const page = toPositiveInt(req.query?.page, 1, 1, 1000000);
    const pageSize = MOVIES_PAGE_SIZE;
    const search = String(req.query?.search || "").trim();
    const sortBy = normalizeSortBy(req.query?.sortBy);
    const minRating = toBoundedNumber(req.query?.minRating, 0, 0, 5);
    const maxRating = Math.max(minRating, toBoundedNumber(req.query?.maxRating, 5, 0, 5));

    await enforceMovieAccessForCurrentPhase(req);
    const [movies, visibility] = await Promise.all([
      listMovies(),
      getVisibleMovieIdsForCurrentPhase(),
    ]);

    const visibleMovies = visibility.visibleIds
      ? movies.filter((movie) => visibility.visibleIds.has(Number(movie?.id)))
      : movies;
    const filteredMovies = filterAndSortMovies(visibleMovies, {
      search,
      sortBy,
      minRating,
      maxRating,
    });

    const totalItems = filteredMovies.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const paginatedMovies = filteredMovies.slice(offset, offset + pageSize);

    return res.json({
      ok: true,
      movies: paginatedMovies,
      pagination: {
        page: safePage,
        pageSize,
        totalItems,
        totalPages,
        hasNextPage: safePage < totalPages,
        hasPreviousPage: safePage > 1,
      },
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("[MOVIES] list error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger la liste des films.",
      details: error.message,
    });
  }
}

export async function getMovieById(req, res) {
  const movieId = toMovieId(req.params.id);
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    await enforceMovieAccessForCurrentPhase(req);
    const [movie, visibility] = await Promise.all([
      getMovieDetails({ movieId }),
      getVisibleMovieIdsForCurrentPhase(),
    ]);
    if (!movie) {
      return res.status(404).json({ error: "Film introuvable." });
    }
    if (visibility.visibleIds && !visibility.visibleIds.has(movieId)) {
      return res.status(404).json({ error: "Film introuvable." });
    }

    return res.json({ ok: true, movie });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("[MOVIES] details error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les details du film.",
      details: error.message,
    });
  }
}
