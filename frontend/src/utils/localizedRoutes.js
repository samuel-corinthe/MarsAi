const ROUTE_PATHS = {
  home: {
    fr: "/accueil",
    en: "/home",
    ar: "/ar/home",
  },
  about: {
    fr: "/a-propos",
    en: "/about",
    ar: "/ar/about",
  },
  films: {
    fr: "/films",
    en: "/movies",
    ar: "/ar/movies",
  },
  agenda: {
    fr: "/agenda",
    en: "/schedule",
    ar: "/ar/schedule",
  },
  jury: {
    fr: "/jury",
    en: "/jury-eng",
    ar: "/ar/jury",
  },
  partners: {
    fr: "/partenaires",
    en: "/partners",
    ar: "/ar/partners",
  },
  call: {
    fr: "/appel-a-projet",
    en: "/call-for-project",
    ar: "/ar/call-for-project",
  },
  submitFilm: {
    fr: "/deposer-un-film",
    en: "/submit-film",
    ar: "/ar/submit-film",
  },
  cgv: {
    fr: "/cgv",
    en: "/tos",
    ar: "/ar/tos",
  },
  cgu: {
    fr: "/cgu",
    en: "/gcu",
    ar: "/ar/gcu",
  },
  legal: {
    fr: "/mentions-legales",
    en: "/legal-notice",
    ar: "/ar/legal-notice",
  },
  contact: {
    fr: "/contact",
    en: "/contact",
    ar: "/ar/contact",
  },
  newsletter: {
    fr: "/newsletter",
    en: "/newsletter",
    ar: "/ar/newsletter",
  },
  privacy: {
    fr: "/privacy",
    en: "/privacy",
    ar: "/ar/privacy",
  },
};

const PATH_ROUTE_KEYS = {
  "/": "home",
  "/accueil": "home",
  "/home": "home",
  "/partner": "partners",
  "/a-propos": "about",
  "/about": "about",
  "/films": "films",
  "/movies": "films",
  "/agenda": "agenda",
  "/schedule": "agenda",
  "/jury": "jury",
  "/jury-eng": "jury",
  "/partenaires": "partners",
  "/partners": "partners",
  "/appel-a-projet": "call",
  "/call-for-project": "call",
  "/call-for-projects": "call",
  "/deposer-un-film": "submitFilm",
  "/submit-film": "submitFilm",
  "/submit-a-film": "submitFilm",
  "/concours": "submitFilm",
  "/cgv": "cgv",
  "/tos": "cgv",
  "/cgu": "cgu",
  "/gcu": "cgu",
  "/mentions-legales": "legal",
  "/legal-notice": "legal",
  "/contact": "contact",
  "/newsletter": "newsletter",
  "/privacy": "privacy",
};

export function normalizeLanguage(value = "fr") {
  const language = String(value || "").toLowerCase();
  if (language.startsWith("ar")) return "ar";
  if (language.startsWith("en")) return "en";
  return "fr";
}

export function normalizePath(path = "/") {
  const value = String(path || "").trim();
  if (!value) return "/";
  const prefixed = value.startsWith("/") ? value : `/${value}`;
  const normalized = prefixed.replace(/\/+$/, "");
  return normalized || "/";
}

function stripLocalePrefix(path) {
  const normalized = normalizePath(path);
  const stripped = normalized.replace(/^\/(?:en|ar)(?=\/)/, "");
  return stripped || "/";
}

export function getLocalizedPath(key, lang = "fr") {
  const language = normalizeLanguage(lang);
  const localized = ROUTE_PATHS[key];
  if (!localized) return "/";
  return localized[language] || localized.fr || "/";
}

export function getLocalizedMoviePath(movieId, lang = "fr") {
  const safeId = String(movieId || "").trim();
  if (!safeId) return normalizeLanguage(lang) === "ar" ? "/ar/movie" : "/movie";
  return normalizeLanguage(lang) === "ar"
    ? `/ar/movie/${safeId}`
    : `/movie/${safeId}`;
}

export function getRouteKeyFromPath(path = "/") {
  const normalized = normalizePath(path);

  if (/^\/(?:en\/|ar\/)?movie(?:\/[^/]+)?$/i.test(normalized)) {
    return "movie";
  }

  return (
    PATH_ROUTE_KEYS[normalized] ||
    PATH_ROUTE_KEYS[stripLocalePrefix(normalized)] ||
    null
  );
}

export function isSameRoute(pathA, pathB) {
  const keyA = getRouteKeyFromPath(pathA);
  const keyB = getRouteKeyFromPath(pathB);

  if (keyA || keyB) {
    return keyA === keyB;
  }

  return normalizePath(pathA) === normalizePath(pathB);
}

export function getEquivalentLocalizedPath(path, lang = "fr") {
  const normalized = normalizePath(path);
  const language = normalizeLanguage(lang);

  if (normalized === "/") {
    return getLocalizedPath("home", language);
  }

  const movieMatch = normalized.match(/^\/(?:en\/|ar\/)?movie\/([^/]+)$/i);
  if (movieMatch) {
    return getLocalizedMoviePath(movieMatch[1], language);
  }

  const routeKey = getRouteKeyFromPath(normalized);
  if (routeKey && routeKey !== "movie") {
    return getLocalizedPath(routeKey, language);
  }

  const stripped = stripLocalePrefix(normalized);
  if (language === "ar") {
    return stripped === "/" ? getLocalizedPath("home", language) : `/ar${stripped}`;
  }

  return stripped;
}

export function buildLocalizedSlugPath(routeSlug, lang = "fr") {
  const safeSlug = String(routeSlug || "").trim().replace(/^\/+/, "");
  if (!safeSlug) return getLocalizedPath("home", lang);
  return normalizeLanguage(lang) === "ar" ? `/ar/${safeSlug}` : `/${safeSlug}`;
}
