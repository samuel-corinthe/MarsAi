export const DEFAULT_MOVIE_POSTER_PATH = "/images/default-movie-poster.png";

export function isLegacyGeneratedPosterUrl(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  if (/default-movie-poster\.png/i.test(raw)) return true;
  return /^https?:\/\/picsum\.photos\/seed\//i.test(raw);
}

export function getDefaultMoviePosterUrl(token = "") {
  const safeToken = String(token || "").trim();
  if (!safeToken) return DEFAULT_MOVIE_POSTER_PATH;
  return `${DEFAULT_MOVIE_POSTER_PATH}?fallback=${encodeURIComponent(safeToken)}`;
}
