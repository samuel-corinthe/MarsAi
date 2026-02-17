import { getDbPool } from "../db.js";
import {
  findAllMovies,
  findMovieById,
  findCastByMovieId,
  findCastByMovieIds,
} from "../models/movieModel.js";

const FALLBACK_POSTER_PREFIX = "https://picsum.photos/seed/marsai-movie-";

function toArray(value) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry || "").trim())
      .filter(Boolean);
  }

  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed) return [];

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((entry) => String(entry || "").trim())
          .filter(Boolean);
      }
    } catch {
      // Fallback CSV parsing below.
    }
  }

  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toCast(value) {
  if (Array.isArray(value)) {
    return value.filter((entry) => entry && typeof entry === "object");
  }

  if (typeof value !== "string") return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((entry) => entry && typeof entry === "object")
      : [];
  } catch {
    return [];
  }
}

function normalizeCastEntry(entry, index) {
  if (!entry || typeof entry !== "object") return null;

  const name = String(entry.name ?? entry.person_name ?? "").trim();
  const role = String(entry.role ?? entry.role_name ?? "").trim();
  const img = String(entry.img ?? entry.avatar_url ?? "").trim();

  if (!name && !role && !img) return null;

  return {
    name: name || `Cast ${index + 1}`,
    role: role || "N/A",
    img,
  };
}

function normalizeCast(value) {
  const entries = Array.isArray(value) ? value : toCast(value);
  return entries
    .map((entry, index) => normalizeCastEntry(entry, index))
    .filter(Boolean);
}

function isMissingCastTableError(error) {
  const code = String(error?.code || "");
  if (code === "ER_NO_SUCH_TABLE") return true;
  return String(error?.message || "").toLowerCase().includes("movie_cast");
}

async function loadCastByMovieIds(pool, movieIds) {
  if (!movieIds.length) return new Map();

  try {
    const rows = await findCastByMovieIds(pool, movieIds);
    const castByMovieId = new Map();

    rows.forEach((row) => {
      const movieId = Number(row.movie_id);
      if (!Number.isFinite(movieId) || movieId <= 0) return;

      if (!castByMovieId.has(movieId)) {
        castByMovieId.set(movieId, []);
      }

      castByMovieId.get(movieId).push(row);
    });

    return castByMovieId;
  } catch (error) {
    if (isMissingCastTableError(error)) {
      return new Map();
    }
    throw error;
  }
}

async function loadCastByMovieId(pool, movieId) {
  try {
    const rows = await findCastByMovieId(pool, movieId);
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    if (isMissingCastTableError(error)) {
      return [];
    }
    throw error;
  }
}

function toDurationLabel(rawValue) {
  const duration = Number(rawValue);
  if (!Number.isFinite(duration) || duration <= 0) {
    return "N/A";
  }

  const wholeMinutes = Math.floor(duration);
  const hours = Math.floor(wholeMinutes / 60);
  const minutes = wholeMinutes % 60;

  if (hours <= 0) return `${wholeMinutes} min`;
  if (minutes <= 0) return `${hours}h`;
  return `${hours}h ${minutes}min`;
}

function toReleaseDateLabel(rawReleaseDate, rawReleaseYear) {
  if (rawReleaseDate != null && String(rawReleaseDate).trim()) {
    return String(rawReleaseDate).trim();
  }

  const releaseYear = Number(rawReleaseYear);
  if (Number.isFinite(releaseYear) && releaseYear > 0) {
    return String(Math.floor(releaseYear));
  }

  return "N/A";
}

function toGenreList(row) {
  const genres = [
    ...toArray(row.genre),
    ...toArray(row.genres),
    ...toArray(row.category),
    ...toArray(row.categories),
  ];

  if (genres.length) return [...new Set(genres)];
  return ["Uncategorized"];
}

function toPosterUrl(row) {
  const rawPoster = row.poster_url || row.posterUrl || row.img || row.image;
  const poster = typeof rawPoster === "string" ? rawPoster.trim() : "";
  if (poster) return poster;

  const movieId = Number(row.id);
  const seed = Number.isFinite(movieId) && movieId > 0 ? movieId : "fallback";
  return `${FALLBACK_POSTER_PREFIX}${seed}/600/900`;
}

function mapMovieRow(row) {
  const movieId = Number(row.id);

  return {
    id: Number.isFinite(movieId) && movieId > 0 ? movieId : 0,
    title: String(row.title || "Film sans titre"),
    description: String(row.synopsis || row.description || ""),
    genre: toGenreList(row),
    director: String(row.director || "Inconnu"),
    releaseDate: toReleaseDateLabel(row.release_date || row.releaseDate, row.release_year),
    duration: toDurationLabel(row.duration),
    img: toPosterUrl(row),
    aiTools: toArray(row.ai_tools || row.aiTools),
    cast: normalizeCast(row.cast),
    country: String(row.country_name_fr || row.country_name_eng || ""),
    submissionStatus: String(row.submission_status || ""),
    videoUrl: String(row.youtube_url || row.video_url || ""),
  };
}

function mapMovieRowWithCast(row, castOverride = null) {
  const base = mapMovieRow(row);
  if (!Array.isArray(castOverride) || castOverride.length === 0) {
    return base;
  }

  return {
    ...base,
    cast: normalizeCast(castOverride),
  };
}

export function toMovieId(rawValue) {
  const movieId = Number(rawValue);
  return Number.isFinite(movieId) && movieId > 0 ? movieId : null;
}

export async function listMovies() {
  const pool = getDbPool();
  const rows = await findAllMovies(pool);
  const movieIds = rows
    .map((row) => Number(row.id))
    .filter((movieId) => Number.isFinite(movieId) && movieId > 0);
  const castByMovieId = await loadCastByMovieIds(pool, movieIds);

  return rows.map((row) => {
    const movieId = Number(row.id);
    const castRows = castByMovieId.get(movieId) || null;
    return mapMovieRowWithCast(row, castRows);
  });
}

export async function getMovieDetails({ movieId }) {
  const pool = getDbPool();
  const row = await findMovieById(pool, movieId);
  if (!row) return null;

  const castRows = await loadCastByMovieId(pool, movieId);
  return mapMovieRowWithCast(row, castRows);
}
