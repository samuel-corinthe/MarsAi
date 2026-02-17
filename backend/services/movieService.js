import { getDbPool } from "../db.js";
import { findAllMovies, findMovieById } from "../models/movieModel.js";

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
    cast: toCast(row.cast),
    country: String(row.country_name_fr || row.country_name_eng || ""),
    submissionStatus: String(row.submission_status || ""),
    videoUrl: String(row.youtube_url || row.video_url || ""),
  };
}

export function toMovieId(rawValue) {
  const movieId = Number(rawValue);
  return Number.isFinite(movieId) && movieId > 0 ? movieId : null;
}

export async function listMovies() {
  const pool = getDbPool();
  const rows = await findAllMovies(pool);
  return rows.map(mapMovieRow);
}

export async function getMovieDetails({ movieId }) {
  const pool = getDbPool();
  const row = await findMovieById(pool, movieId);
  return row ? mapMovieRow(row) : null;
}
