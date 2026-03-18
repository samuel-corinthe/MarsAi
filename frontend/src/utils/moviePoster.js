import { resolvePublicAssetPath } from "./assetUrl";

export const DEFAULT_MOVIE_POSTER_PATH = "/images/default-movie-poster.png";

function isDefaultMoviePosterLike(value) {
  const raw = String(value || "").trim();
  if (!raw) return true;
  if (/default-movie-poster\.png/i.test(raw)) return true;
  return /^https?:\/\/picsum\.photos\/seed\//i.test(raw);
}

function buildDefaultMoviePosterPath(seed = "") {
  const safeSeed = String(seed || "").trim();
  if (!safeSeed) return DEFAULT_MOVIE_POSTER_PATH;
  return `${DEFAULT_MOVIE_POSTER_PATH}?fallback=${encodeURIComponent(safeSeed)}`;
}

export function resolveMoviePosterSrc(value, seed = "") {
  const raw = String(value || "").trim();
  if (isDefaultMoviePosterLike(raw)) {
    return resolvePublicAssetPath(buildDefaultMoviePosterPath(seed));
  }
  return resolvePublicAssetPath(raw);
}

export function applyMoviePosterFallback(event, seed = "") {
  const target = event?.currentTarget;
  if (!target) return;
  target.onerror = null;
  target.src = resolveMoviePosterSrc("", seed);
}
