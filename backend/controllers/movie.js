import fs from "node:fs";
import path from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import {
  getMovieDetails,
  listMovies,
  toMovieId,
  updateMovieYoutubeUrl,
} from "../services/movieService.js";
import { getPhase2SelectionStatus, getSitePhaseState } from "../services/sitePhaseService.js";
import { getSessionFromRequest } from "../services/authService.js";
import {
  downloadObjectFromPublicUrl,
  isPublicObjectStorageUrl,
} from "../services/objectStorageService.js";
import { getDbPool } from "../db.js";
import {
  findMovieById,
  listPhase3MovieCategories,
  replacePhase3MovieCategories,
} from "../models/movieModel.js";

const MOVIE_SORT_VALUES = new Set([
  "default",
  "title_asc",
  "title_desc",
  "year_asc",
  "year_desc",
  "category_asc",
  "category_desc",
]);
const MOVIES_PAGE_SIZE = 20;
const MAX_PHASE3_CATEGORY_COUNT = 12;
const MAX_PHASE3_CATEGORY_LENGTH = 100;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOCAL_VIDEO_UPLOADS_DIR = path.resolve(__dirname, "../uploads/videos");

function isAdminSession(session) {
  return ["admin", "superadmin"].includes(String(session?.role || "").toLowerCase());
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function normalizePhase3Categories(rawCategories) {
  if (!Array.isArray(rawCategories)) {
    throw createHttpError(400, "categories doit etre un tableau.");
  }

  const seen = new Set();
  const normalized = [];

  for (const rawCategory of rawCategories) {
    const categoryName = String(rawCategory ?? "")
      .replace(/\s+/g, " ")
      .trim();

    if (!categoryName) continue;
    if (categoryName.length > MAX_PHASE3_CATEGORY_LENGTH) {
      throw createHttpError(
        400,
        `Chaque categorie doit contenir au maximum ${MAX_PHASE3_CATEGORY_LENGTH} caracteres.`,
      );
    }

    const dedupeKey = categoryName.toLowerCase();
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(categoryName);

    if (normalized.length > MAX_PHASE3_CATEGORY_COUNT) {
      throw createHttpError(
        400,
        `Maximum ${MAX_PHASE3_CATEGORY_COUNT} categories par film.`,
      );
    }
  }

  return normalized;
}

async function ensureMovieExists(pool, movieId) {
  const movie = await findMovieById(pool, movieId);
  if (!movie) {
    throw createHttpError(404, "Film introuvable.");
  }
}

async function enforcePhase3CategoryEditionWindow() {
  const sitePhase = await getSitePhaseState();
  const phaseKey = String(sitePhase?.currentPhase || "").toLowerCase();

  if (phaseKey !== "phase_2") {
    throw createHttpError(
      409,
      "Les categories phase 3 peuvent etre modifiees uniquement pendant la selection phase 3.",
    );
  }
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

function normalizeCategoryFilters(rawCategories) {
  const sourceValues = Array.isArray(rawCategories) ? rawCategories : [rawCategories];
  const seen = new Set();
  const normalized = [];

  sourceValues.forEach((rawValue) => {
    String(rawValue || "")
      .split(",")
      .map((value) => value.replace(/\s+/g, " ").trim())
      .filter(Boolean)
      .forEach((value) => {
        const dedupeKey = value.toLowerCase();
        if (seen.has(dedupeKey)) return;
        seen.add(dedupeKey);
        normalized.push(value);
      });
  });

  return normalized.slice(0, MAX_PHASE3_CATEGORY_COUNT);
}

function toDownloadFileName(title) {
  const normalized = String(title || "film")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `${normalized || "film"}.mp4`;
}

function toLocalVideoPath(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const noHost = raw.replace(/^https?:\/\/[^/]+/i, "");
  const noBase = noHost.replace(/^\/MarsAi/i, "");
  const noQuery = noBase.split("?")[0].split("#")[0];
  if (!noQuery.startsWith("/uploads/videos/")) return null;

  const fileName = path.basename(noQuery);
  if (!fileName) return null;

  return path.join(LOCAL_VIDEO_UPLOADS_DIR, fileName);
}

function isRemoteMp4Url(value) {
  return /^https?:\/\/[^?#]+\.mp4(?:[?#].*)?$/i.test(String(value || "").trim());
}

function setFileHeaders(
  res,
  fileName,
  contentType,
  contentLength,
  disposition = "attachment",
) {
  res.setHeader("Content-Disposition", `${disposition}; filename="${fileName}"`);
  res.setHeader("Cache-Control", "no-store");

  if (contentType) {
    res.setHeader("Content-Type", contentType);
  }
  if (Number.isFinite(Number(contentLength)) && Number(contentLength) > 0) {
    res.setHeader("Content-Length", String(Number(contentLength)));
  }
}

function extractMovieYear(movie) {
  const releaseDate = String(movie?.releaseDate || "").trim();
  const match = releaseDate.match(/\d{4}/);
  return Number(match?.[0] || 0);
}

function getMovieCategoryList(movie) {
  return (Array.isArray(movie?.genre) ? movie.genre : [])
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .filter((value) => value.toLowerCase() !== "uncategorized");
}

function getMovieCategorySearchText(movie) {
  return getMovieCategoryList(movie).join(" ").toLowerCase();
}

function compareMoviesByCategory(a, b, direction = "asc") {
  const aCategory = getMovieCategoryList(a)[0] || "";
  const bCategory = getMovieCategoryList(b)[0] || "";

  if (!aCategory && !bCategory) {
    return String(a?.title || "").localeCompare(String(b?.title || ""), "fr", {
      sensitivity: "base",
    });
  }
  if (!aCategory) return 1;
  if (!bCategory) return -1;

  const categoryComparison = aCategory.localeCompare(bCategory, "fr", {
    sensitivity: "base",
  });
  if (categoryComparison !== 0) {
    return direction === "desc" ? -categoryComparison : categoryComparison;
  }

  const titleComparison = String(a?.title || "").localeCompare(String(b?.title || ""), "fr", {
    sensitivity: "base",
  });
  return direction === "desc" ? -titleComparison : titleComparison;
}

function stripPhase3Categories(movie) {
  if (!movie || typeof movie !== "object") return movie;
  return {
    ...movie,
    genre: [],
  };
}

function shouldExposePhase3Categories({ session, phaseKey }) {
  return isAdminSession(session) || phaseKey === "phase_3";
}

function getAvailableMovieCategories(movies) {
  const uniqueCategories = new Map();

  (Array.isArray(movies) ? movies : []).forEach((movie) => {
    getMovieCategoryList(movie).forEach((categoryName) => {
      const dedupeKey = categoryName.toLowerCase();
      if (!uniqueCategories.has(dedupeKey)) {
        uniqueCategories.set(dedupeKey, categoryName);
      }
    });
  });

  return [...uniqueCategories.values()].sort((a, b) =>
    a.localeCompare(b, "fr", { sensitivity: "base" }),
  );
}

function filterAndSortMovies(movies, {
  search,
  sortBy,
  minRating,
  maxRating,
  selectedCategories = [],
  includeCategorySearch = true,
}) {
  const searchToken = String(search || "").trim().toLowerCase();
  const filtered = (Array.isArray(movies) ? movies : []).filter((movie) => {
    const movieTitle = String(movie?.title || "").toLowerCase();
    const movieDirector = String(movie?.director || "").toLowerCase();
    const movieCountry = String(movie?.country || "").toLowerCase();
    const movieCategoryList = getMovieCategoryList(movie);
    const movieCategories = getMovieCategorySearchText(movie);
    const movieRating = Number(movie?.rating || 0);
    const matchesSelectedCategories =
      selectedCategories.length === 0
      || selectedCategories.some((selectedCategory) =>
        movieCategoryList.some(
          (categoryName) => categoryName.toLowerCase() === String(selectedCategory || "").toLowerCase(),
        ),
      );

    const matchesSearch = !searchToken
      || movieTitle.includes(searchToken)
      || movieDirector.includes(searchToken)
      || movieCountry.includes(searchToken)
      || (includeCategorySearch && movieCategories.includes(searchToken));
    const matchesRating = movieRating >= minRating && movieRating <= maxRating;

    return matchesSearch && matchesRating && matchesSelectedCategories;
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
    if (sortBy === "category_asc") {
      return compareMoviesByCategory(a, b, "asc");
    }
    if (sortBy === "category_desc") {
      return compareMoviesByCategory(a, b, "desc");
    }
    return Number(b?.id || 0) - Number(a?.id || 0);
  });

  return sorted;
}

export async function getAllMovies(req, res) {
  try {
    const session = getSessionFromRequest(req);
    const page = toPositiveInt(req.query?.page, 1, 1, 1000000);
    const pageSize = MOVIES_PAGE_SIZE;
    const search = String(req.query?.search || "").trim();
    const requestedSortBy = normalizeSortBy(req.query?.sortBy);
    const requestedCategories = normalizeCategoryFilters(req.query?.categories);
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
    const canExposeCategories = shouldExposePhase3Categories({
      session,
      phaseKey: visibility.phaseKey,
    });
    const sanitizedMovies = canExposeCategories
      ? visibleMovies
      : visibleMovies.map(stripPhase3Categories);
    const availableCategories = canExposeCategories
      ? getAvailableMovieCategories(sanitizedMovies)
      : [];
    const sortBy = !canExposeCategories && requestedSortBy.startsWith("category_")
      ? "default"
      : requestedSortBy;
    const selectedCategories = canExposeCategories ? requestedCategories : [];
    const filteredMovies = filterAndSortMovies(sanitizedMovies, {
      search,
      sortBy,
      minRating,
      maxRating,
      selectedCategories,
      includeCategorySearch: canExposeCategories,
    });

    const totalItems = filteredMovies.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(page, totalPages);
    const offset = (safePage - 1) * pageSize;
    const paginatedMovies = filteredMovies.slice(offset, offset + pageSize);

    return res.json({
      ok: true,
      movies: paginatedMovies,
      availableCategories,
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
    const session = getSessionFromRequest(req);
    const [movie, visibility] = await Promise.all([
      getMovieDetails({ movieId, includeSubmitterEmail: Boolean(session) }),
      getVisibleMovieIdsForCurrentPhase(),
    ]);
    if (!movie) {
      return res.status(404).json({ error: "Film introuvable." });
    }
    if (visibility.visibleIds && !visibility.visibleIds.has(movieId)) {
      return res.status(404).json({ error: "Film introuvable." });
    }

    const safeMovie = shouldExposePhase3Categories({
      session,
      phaseKey: visibility.phaseKey,
    })
      ? movie
      : stripPhase3Categories(movie);

    return res.json({ ok: true, movie: safeMovie });
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

export async function patchMovieYoutubeUrl(req, res) {
  const movieId = toMovieId(req.params.id);
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    const payload = await updateMovieYoutubeUrl({
      movieId,
      youtubeUrl: req.body?.youtubeUrl,
    });

    return res.json({ ok: true, ...payload });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("[MOVIES] patch youtube url error:", error.message);
    return res.status(500).json({
      error: "Impossible de mettre a jour le lien YouTube.",
      details: error.message,
    });
  }
}

export async function getMoviePhase3Categories(req, res) {
  const movieId = toMovieId(req.params.id);
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    const pool = getDbPool();
    await ensureMovieExists(pool, movieId);
    const categories = await listPhase3MovieCategories(pool, movieId);

    return res.json({ ok: true, categories });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("[MOVIES] get phase3 categories error:", error.message);
    return res.status(500).json({
      error: "Impossible de lire les categories phase 3.",
      details: error.message,
    });
  }
}

export async function patchMoviePhase3Categories(req, res) {
  const movieId = toMovieId(req.params.id);
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    const categories = normalizePhase3Categories(req.body?.categories);
    const actorUserId = Number(req.auth?.userId) || null;
    const pool = getDbPool();

    await ensureMovieExists(pool, movieId);
    await enforcePhase3CategoryEditionWindow();
    await replacePhase3MovieCategories(pool, movieId, categories, actorUserId);

    return res.json({ ok: true, categories });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("[MOVIES] patch phase3 categories error:", error.message);
    return res.status(500).json({
      error: "Impossible de mettre a jour les categories phase 3.",
      details: error.message,
    });
  }
}

export async function downloadMovieById(req, res) {
  const movieId = toMovieId(req.params.id);
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "Session requise pour telecharger." });
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

    const sourceUrl = String(movie?.rawVideoUrl || movie?.videoUrl || "").trim();
    if (!sourceUrl) {
      return res.status(404).json({ error: "Aucune source video disponible pour ce film." });
    }

    const downloadFileName = toDownloadFileName(movie?.title);

    if (isPublicObjectStorageUrl(sourceUrl)) {
      const objectPayload = await downloadObjectFromPublicUrl(sourceUrl);
      if (!objectPayload?.stream) {
        return res.status(404).json({ error: "Impossible de recuperer le fichier video." });
      }

      setFileHeaders(
        res,
        downloadFileName,
        objectPayload.contentType || "video/mp4",
        objectPayload.contentLength,
        "attachment",
      );

      objectPayload.stream.on("error", (streamError) => {
        console.error("[MOVIES] download stream error:", streamError?.message || streamError);
        if (!res.headersSent) {
          res.status(502).json({ error: "Flux video indisponible." });
          return;
        }
        res.destroy(streamError);
      });

      objectPayload.stream.pipe(res);
      return;
    }

    const localVideoPath = toLocalVideoPath(sourceUrl);
    if (localVideoPath && fs.existsSync(localVideoPath)) {
      setFileHeaders(res, downloadFileName, "video/mp4", null, "attachment");
      return res.sendFile(localVideoPath);
    }

    if (isRemoteMp4Url(sourceUrl)) {
      const upstream = await fetch(sourceUrl);
      if (!upstream.ok) {
        return res.status(502).json({ error: "Source video distante indisponible." });
      }

      setFileHeaders(
        res,
        downloadFileName,
        upstream.headers.get("content-type") || "video/mp4",
        Number(upstream.headers.get("content-length") || 0) || null,
        "attachment",
      );

      if (!upstream.body) {
        const buffer = Buffer.from(await upstream.arrayBuffer());
        res.end(buffer);
        return;
      }

      const nodeStream = Readable.fromWeb(upstream.body);
      nodeStream.on("error", (streamError) => {
        console.error("[MOVIES] upstream stream error:", streamError?.message || streamError);
        if (!res.headersSent) {
          res.status(502).json({ error: "Flux video indisponible." });
          return;
        }
        res.destroy(streamError);
      });
      nodeStream.pipe(res);
      return;
    }

    return res.status(400).json({
      error: "Source video non compatible pour telechargement.",
    });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("[MOVIES] download error:", error.message);
    return res.status(500).json({
      error: "Impossible de telecharger le film.",
      details: error.message,
    });
  }
}
