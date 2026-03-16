import { getDbPool } from "../db.js";
import {
  findAllMovies,
  findMovieById,
  findCastByMovieId,
  findCastByMovieIds,
  updateMovieYoutubeUrl as updateMovieYoutubeUrlInDb,
} from "../models/movieModel.js";
import {
  isObjectStorageConfigured,
  isPublicObjectStorageUrl,
} from "./objectStorageService.js";
import { resolveCountryFlagPath } from "./countryFlagPath.js";

const FALLBACK_POSTER_PREFIX = "https://picsum.photos/seed/marsai-movie-";

function decodeHtmlEntities(value) {
  const raw = String(value ?? "");
  if (!raw) return "";

  return raw
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, "\"")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function normalizeEmailAddress(value) {
  const raw = String(value || "").trim().toLowerCase();
  return raw || "";
}

function extractYoutubeVideoId(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const directIdMatch = raw.match(/^[a-zA-Z0-9_-]{11}$/);
  if (directIdMatch) {
    return directIdMatch[0];
  }

  try {
    const url = new URL(raw);
    const host = String(url.hostname || "").toLowerCase();
    const pathname = String(url.pathname || "");

    if (host.includes("youtu.be")) {
      return pathname.replace(/^\/+/, "").split("/")[0] || "";
    }

    if (host.includes("youtube.com") || host.includes("youtube-nocookie.com")) {
      if (pathname.startsWith("/watch")) {
        return String(url.searchParams.get("v") || "").trim();
      }

      const pathParts = pathname.split("/").filter(Boolean);
      if (pathParts[0] === "embed" || pathParts[0] === "shorts") {
        return pathParts[1] || "";
      }
    }
  } catch {
    return "";
  }

  return "";
}

function normalizeYoutubeUrl(value) {
  const videoId = extractYoutubeVideoId(value);
  if (!videoId) return "";
  return `https://www.youtube.com/watch?v=${videoId}`;
}

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

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

function toSocialLinks(value) {
  if (!value) return {};

  let source = value;
  if (typeof value === "string") {
    try {
      source = JSON.parse(value);
    } catch {
      return {};
    }
  }

  if (!source || typeof source !== "object") return {};

  const pick = (entry) => {
    const raw = String(entry || "").trim();
    if (!raw) return "";
    return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  };

  const normalized = {};
  const website = pick(source.website);
  const instagram = pick(source.instagram);
  const facebook = pick(source.facebook);
  const x = pick(source.x || source.twitter);

  if (website) normalized.website = website;
  if (instagram) normalized.instagram = instagram;
  if (facebook) normalized.facebook = facebook;
  if (x) normalized.x = x;

  return normalized;
}

function isDirectPlayableVideoUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;

  if (/^https?:\/\/[^?#]+\.(mp4)(?:[?#].*)?$/i.test(raw)) {
    return true;
  }

  if (/^\/(?:MarsAi\/)?uploads\/videos\/.+\.mp4$/i.test(raw)) {
    return true;
  }

  return /^https?:\/\/[^/]+\/(?:MarsAi\/)?uploads\/videos\/.+\.mp4$/i.test(raw);
}

function isS3MediaUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return false;
  if (isPublicObjectStorageUrl(raw)) return true;
  if (!isObjectStorageConfigured()) {
    return /^https?:\/\/s3\.[^/]+\.scw\.cloud\/.+/i.test(raw);
  }
  return false;
}

function isS3BackedMovieRow(row) {
  return isS3MediaUrl(row?.video_url);
}

function normalizeCastEntry(entry, index) {
  if (!entry || typeof entry !== "object") return null;

  const name = decodeHtmlEntities(entry.name ?? entry.person_name ?? "").trim();
  const role = decodeHtmlEntities(entry.role ?? entry.role_name ?? "").trim();
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
  const durationSeconds = Number(rawValue);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return "N/A";
  }

  const totalSeconds = Math.round(durationSeconds);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes <= 0) return `${totalSeconds}s`;
  if (seconds <= 0) return `${minutes}min`;
  return `${minutes}min ${seconds}s`;
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

function mapMovieRow(row, options = {}) {
  const { includeSubmitterEmail = false } = options;
  const movieId = Number(row.id);
  const countryCode = String(row.country_alpha2 || "").trim().toUpperCase();
  const countryFlagPath = resolveCountryFlagPath(row.country_flag_path, countryCode);
  const localVideoUrl = String(row.video_url || "").trim();
  const youtubeUrl = String(row.youtube_url || "").trim();
  const playbackVideoUrl = isDirectPlayableVideoUrl(localVideoUrl) ? localVideoUrl : "";
  const submitterEmail = includeSubmitterEmail
    ? normalizeEmailAddress(row.submitter_email || row.submitterEmail)
    : "";

  return {
    id: Number.isFinite(movieId) && movieId > 0 ? movieId : 0,
    title: decodeHtmlEntities(row.title || "Film sans titre"),
    description: decodeHtmlEntities(row.synopsis || row.description || ""),
    genre: toGenreList(row),
    director: decodeHtmlEntities(row.submitted_by || row.director || "Inconnu"),
    releaseDate: toReleaseDateLabel(row.release_date || row.releaseDate, row.release_year),
    duration: toDurationLabel(row.duration),
    img: toPosterUrl(row),
    aiTools: toArray(row.ai_tools || row.aiTools),
    cast: normalizeCast(row.cast),
    bio: decodeHtmlEntities(row.bio || ""),
    socialLinks: toSocialLinks(row.social_links || row.socialLinks),
    language: String(row.language || ""),
    subtitleLanguage: String(row.subtitle_language || ""),
    age: Number.isFinite(Number(row.age)) ? Number(row.age) : null,
    country: decodeHtmlEntities(row.country_name_fr || row.country_name_eng || ""),
    countryAlpha2: countryCode,
    countryFlagPath,
    countryId: Number.isFinite(Number(row.country_id)) ? Number(row.country_id) : null,
    viewCount: Number.isFinite(Number(row.view_count)) ? Number(row.view_count) : 0,
    rating: Number.isFinite(Number(row.avg_rating)) ? Number(row.avg_rating) : 0,
    notesCount: Number.isFinite(Number(row.notes_count)) ? Number(row.notes_count) : 0,
    submittedBy: decodeHtmlEntities(row.submitted_by || ""),
    submitterEmail: submitterEmail || null,
    submissionStatus: String(row.submission_status || ""),
    videoUrl: playbackVideoUrl,
    youtubeUrl,
    rawVideoUrl: localVideoUrl,
  };
}

function mapMovieRowWithCast(row, castOverride = null, options = {}) {
  const base = mapMovieRow(row, options);
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
  const s3Rows = rows.filter(isS3BackedMovieRow);
  const movieIds = s3Rows
    .map((row) => Number(row.id))
    .filter((movieId) => Number.isFinite(movieId) && movieId > 0);
  const castByMovieId = await loadCastByMovieIds(pool, movieIds);

  return s3Rows.map((row) => {
    const movieId = Number(row.id);
    const castRows = castByMovieId.get(movieId) || null;
    return mapMovieRowWithCast(row, castRows);
  });
}

export async function getMovieDetails({ movieId, includeSubmitterEmail = false }) {
  const pool = getDbPool();
  const row = await findMovieById(pool, movieId);
  if (!row) return null;
  if (!isS3BackedMovieRow(row)) return null;

  const castRows = await loadCastByMovieId(pool, movieId);
  return mapMovieRowWithCast(row, castRows, { includeSubmitterEmail });
}

export async function updateMovieYoutubeUrl({ movieId, youtubeUrl }) {
  const safeMovieId = toMovieId(movieId);
  if (!safeMovieId) {
    throw createHttpError(400, "movieId invalide.");
  }

  const normalizedYoutubeUrl = normalizeYoutubeUrl(youtubeUrl);
  if (!normalizedYoutubeUrl) {
    throw createHttpError(
      400,
      "Lien YouTube invalide. Utilise un lien watch, youtu.be, embed, shorts ou directement l identifiant video.",
    );
  }

  const pool = getDbPool();
  const movie = await findMovieById(pool, safeMovieId);
  if (!movie) {
    throw createHttpError(404, "Film introuvable.");
  }

  const currentYoutubeUrl = String(movie.youtube_url || "").trim();
  if (currentYoutubeUrl === normalizedYoutubeUrl) {
    return {
      movieId: safeMovieId,
      title: decodeHtmlEntities(movie.title || "Sans titre"),
      youtubeUrl: normalizedYoutubeUrl,
      updated: false,
    };
  }

  try {
    await updateMovieYoutubeUrlInDb(pool, safeMovieId, normalizedYoutubeUrl);
  } catch (error) {
    if (error?.code === "ER_DUP_ENTRY") {
      throw createHttpError(409, "Ce lien YouTube est deja utilise par un autre film.");
    }
    throw error;
  }

  return {
    movieId: safeMovieId,
    title: decodeHtmlEntities(movie.title || "Sans titre"),
    youtubeUrl: normalizedYoutubeUrl,
    updated: true,
  };
}
