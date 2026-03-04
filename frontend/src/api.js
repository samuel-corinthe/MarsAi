const WP_V2 = "/wp-json/wp/v2";
const WORDPRESS_BASE_URL = "https://samuel-corinthe.students-laplateforme.io/MarsAi";
const WORDPRESS_V2_URL = `${WORDPRESS_BASE_URL}${WP_V2}`;

function isLocalBrowserHost() {
  if (typeof window === "undefined") return false;
  const host = String(window.location?.hostname || "").toLowerCase();
  return host === "localhost" || host === "127.0.0.1";
}

function appendLocalCandidates(urls) {
  if (!isLocalBrowserHost()) return urls;

  const extras = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ];

  const extended = [...urls];
  urls.forEach((url) => {
    if (!url.startsWith("/")) return;
    extras.forEach((base) => extended.push(`${base}${url}`));
  });

  return extended;
}

function withPrefix(prefix, path) {
  if (!path.startsWith("/")) return path;
  if (!prefix) return path;
  return `${prefix}${path}`;
}

function appendDeploymentPathCandidates(urls) {
  if (typeof window === "undefined") return urls;

  const path = String(window.location?.pathname || "/");
  const segments = path.split("/").filter(Boolean);
  const prefixes = new Set(["", "/MarsAi"]);

  if (segments.length > 0) {
    prefixes.add(`/${segments[0]}`);
  }

  const extended = [...urls];
  urls.forEach((url) => {
    if (!url.startsWith("/")) return;
    prefixes.forEach((prefix) => {
      const candidate = withPrefix(prefix, url);
      if (!extended.includes(candidate)) {
        extended.push(candidate);
      }
    });
  });

  return extended;
}

function isObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isLikelyMoviePayload(payload) {
  const candidate = isObject(payload?.movie) ? payload.movie : payload;
  if (!isObject(candidate)) return false;

  const hasId = Number.isFinite(Number(candidate.id));
  const hasTitle = hasNonEmptyString(candidate.title);
  const hasMovieFields = [
    hasNonEmptyString(candidate.director),
    hasNonEmptyString(candidate.submittedBy),
    hasNonEmptyString(candidate.submitted_by),
    hasNonEmptyString(candidate.country),
    hasNonEmptyString(candidate.country_name_fr),
    hasNonEmptyString(candidate.releaseDate),
    hasNonEmptyString(candidate.release_date),
    hasNonEmptyString(candidate.duration),
    Number.isFinite(Number(candidate.duration)),
    Number.isFinite(Number(candidate.countryId)),
    Number.isFinite(Number(candidate.country_id)),
  ].some(Boolean);

  return hasId && hasTitle && hasMovieFields;
}

async function fetchWith404Fallback(
  urls,
  options = {},
  errorContext = "API",
  validatePayload = null,
) {
  const withDeploymentPaths = appendDeploymentPathCandidates(urls);
  const candidates = appendLocalCandidates(withDeploymentPaths);

  let lastStatus = null;
  let lastPayload = {};
  let lastError = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, options);
      const contentType = String(res.headers.get("content-type") || "").toLowerCase();
      const rawBody = await res.text();
      let payload = {};
      let isJson = contentType.includes("application/json");

      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
          isJson = true;
        } catch {
          payload = {};
        }
      }

      if (res.ok) {
        // Avoid treating HTML pages as valid API payloads.
        if (!isJson) {
          continue;
        }
        if (typeof validatePayload === "function" && !validatePayload(payload)) {
          continue;
        }
        return { payload, status: res.status };
      }

      lastStatus = res.status;
      lastPayload = payload;

      if (res.status === 404 || res.status >= 500) {
        continue;
      }

      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError && lastStatus == null) {
    throw new Error(lastError.message || "Impossible de joindre l'API backend.");
  }

  const fallbackStatus = lastStatus == null ? "unreachable" : lastStatus;
  throw new Error(
    lastPayload?.details || lastPayload?.error || `${errorContext} error ${fallbackStatus}`,
  );
}

async function fetchSameOriginWithFallback(
  urls,
  options = {},
  errorContext = "API",
) {
  const candidates = [...new Set(urls.filter((url) => typeof url === "string" && url.startsWith("/")))];

  let lastStatus = null;
  let lastPayload = {};
  let lastError = null;

  for (const url of candidates) {
    try {
      const res = await fetch(url, options);
      const rawBody = await res.text();
      let payload = {};

      if (rawBody) {
        try {
          payload = JSON.parse(rawBody);
        } catch {
          payload = {};
        }
      }

      if (res.ok) {
        return { payload, status: res.status };
      }

      lastStatus = res.status;
      lastPayload = payload;

      if (res.status === 404) {
        continue;
      }

      break;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError && lastStatus == null) {
    throw new Error(lastError.message || "Impossible de joindre l'API backend.");
  }

  const fallbackStatus = lastStatus == null ? "unreachable" : lastStatus;
  throw new Error(
    lastPayload?.details || lastPayload?.error || `${errorContext} error ${fallbackStatus}`,
  );
}

const REQUEST_CACHE_TTL_MS = 1500;

function createRequestCache(ttlMs = REQUEST_CACHE_TTL_MS) {
  return {
    ttlMs,
    value: undefined,
    timestamp: 0,
    promise: null,
  };
}

const currentSessionCache = createRequestCache();
const sitePhaseCache = createRequestCache();

function hasFreshCacheValue(cache) {
  return cache.timestamp > 0 && (Date.now() - cache.timestamp) < cache.ttlMs;
}

function writeRequestCache(cache, value) {
  cache.value = value;
  cache.timestamp = Date.now();
}

function clearRequestCache(cache) {
  cache.value = undefined;
  cache.timestamp = 0;
  cache.promise = null;
}

async function runCachedRequest(cache, requestFactory) {
  if (cache.promise) {
    return cache.promise;
  }

  if (hasFreshCacheValue(cache)) {
    return cache.value;
  }

  cache.promise = (async () => {
    try {
      const value = await requestFactory();
      writeRequestCache(cache, value);
      return value;
    } catch (error) {
      clearRequestCache(cache);
      throw error;
    } finally {
      cache.promise = null;
    }
  })();

  return cache.promise;
}

function primeCurrentSessionCache(user) {
  writeRequestCache(currentSessionCache, {
    authenticated: true,
    user: user || null,
  });
}

export const getPageBySlug = async (slug, lang = "fr") => {
  const response = await fetch(
    `${WORDPRESS_V2_URL}/pages?slug=${encodeURIComponent(slug)}&lang=${encodeURIComponent(lang)}`,
  );
  const data = await response.json();
  return Array.isArray(data) ? data[0] : null;
};

export async function getWpPostsBySlug({
  slug,
  lang = "fr",
  fields = "id,title,content,excerpt,slug",
  signal,
} = {}) {
  const safeSlug = String(slug || "").trim();
  if (!safeSlug) return [];

  const response = await fetch(
    `${WORDPRESS_V2_URL}/posts?slug=${encodeURIComponent(safeSlug)}&_fields=${encodeURIComponent(fields)}&lang=${encodeURIComponent(lang)}`,
    {
      cache: "no-store",
      signal,
    },
  );
  if (!response.ok) {
    throw new Error(`WP posts by slug error ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getWpPostsByCategory({
  categoryId,
  lang = "fr",
  perPage = 100,
  order = "asc",
  orderBy = "date",
  embed = true,
} = {}) {
  const safeCategoryId = Number(categoryId);
  if (!Number.isFinite(safeCategoryId) || safeCategoryId <= 0) return [];

  const params = new URLSearchParams();
  params.set("categories", String(safeCategoryId));
  params.set("per_page", String(Math.max(1, Math.min(100, Number(perPage) || 100))));
  params.set("order", String(order || "asc"));
  params.set("orderby", String(orderBy || "date"));
  params.set("lang", String(lang || "fr"));
  if (embed) params.set("_embed", "");

  const response = await fetch(`${WORDPRESS_V2_URL}/posts?${params.toString()}`, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error(`WP posts by category error ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

export async function getAgendaPosts() {
  const res = await fetch("/wp-json/wp/v2/posts?per_page=100");
  if (!res.ok) throw new Error(`WP error ${res.status}`);
  return await res.json();
}

function stripHtmlToText(html = "") {
  const raw = String(html || "");
  if (!raw) return "";

  if (typeof window !== "undefined" && typeof window.DOMParser !== "undefined") {
    const doc = new window.DOMParser().parseFromString(raw, "text/html");
    return String(doc?.body?.textContent || "")
      .replace(/\s+/g, " ")
      .trim();
  }

  return raw.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function truncateText(value = "", max = 180) {
  const text = String(value || "").trim();
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max).trim()}...` : text;
}

export async function getRecentAgendaEvents({ lang = "fr", limit = 5 } = {}) {
  const categoryMap = {
    fr: 14,
    en: 51,
    ar: 103,
  };
  const agendaCategoryId =
    categoryMap[String(lang).toLowerCase()] || categoryMap.fr;
  const safeLimit = Math.max(1, Math.min(20, Number(limit) || 5));

  const posts = await getWpPostsByCategory({
    categoryId: agendaCategoryId,
    lang,
    perPage: safeLimit,
    order: "desc",
    orderBy: "date",
    embed: true,
  });

  return posts.slice(0, safeLimit).map((post) => {
    const titleHtml = String(post?.title?.rendered || "").trim();
    const excerptHtml = String(
      post?.excerpt?.rendered || post?.content?.rendered || "",
    ).trim();
    const featuredImage =
      post?._embedded?.["wp:featuredmedia"]?.[0]?.source_url || "";

    return {
      id: Number(post?.id) || 0,
      title: stripHtmlToText(titleHtml),
      excerpt: truncateText(stripHtmlToText(excerptHtml), 180),
      image: String(featuredImage || "").trim(),
      wpLink: String(post?.link || "").trim(),
      date: String(post?.date || "").trim(),
    };
  });
}

export async function getMoviesPaginated({
  page,
  pageSize,
  search,
  sortBy,
  minRating,
  maxRating,
} = {}) {
  const query = new URLSearchParams();
  if (page != null && Number.isFinite(Number(page))) {
    query.set("page", String(Math.max(1, Number(page))));
  }
  if (pageSize != null && Number.isFinite(Number(pageSize))) {
    query.set("pageSize", String(Math.max(1, Number(pageSize))));
  }
  if (search != null && String(search).trim()) {
    query.set("search", String(search).trim());
  }
  if (sortBy != null && String(sortBy).trim()) {
    query.set("sortBy", String(sortBy).trim());
  }
  if (minRating != null && Number.isFinite(Number(minRating))) {
    query.set("minRating", String(Number(minRating)));
  }
  if (maxRating != null && Number.isFinite(Number(maxRating))) {
    query.set("maxRating", String(Number(maxRating)));
  }

  const querySuffix = query.toString() ? `?${query.toString()}` : "";
  const { payload } = await fetchWith404Fallback(
    [`/api/movies${querySuffix}`, `/api/movie${querySuffix}`],
    { cache: "no-store" },
    "Movies API",
  );

  if (Array.isArray(payload)) {
    return {
      movies: payload,
      pagination: null,
    };
  }
  if (Array.isArray(payload?.movies)) {
    return {
      movies: payload.movies,
      pagination: payload?.pagination || null,
    };
  }
  return {
    movies: [],
    pagination: null,
  };
}

export async function getMovies(options = {}) {
  return getMoviesPaginated(options);
}

export async function getMovieById(movieId) {
  const { payload } = await fetchWith404Fallback(
    [`/api/movies/${movieId}`, `/api/movie/${movieId}`],
    { cache: "no-store" },
    "Movie details API",
    isLikelyMoviePayload,
  );

  if (payload?.movie && typeof payload.movie === "object") return payload.movie;
  if (payload && typeof payload === "object" && Number.isFinite(Number(payload.id))) return payload;
  return null;
}

export async function sendContactForm({
  name,
  email,
  subject,
  message,
  lang = "fr",
}) {
  const { payload } = await fetchWith404Fallback(
    ["/api/send-email", "/send-email", "/api/mail/send-email"],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, subject, message, lang }),
    },
    "Contact API",
  );

  return payload;
}

export async function subscribeNewsletterForm({
  firstName,
  email,
  preferences,
  lang = "fr",
}) {
  const { payload } = await fetchWith404Fallback(
    [
      "/api/subscribe-newsletter",
      "/subscribe-newsletter",
      "/api/newsletter/subscribe",
    ],
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ firstName, email, preferences, lang }),
    },
    "Newsletter API",
  );

  return payload;
}

export async function loginWithWordPress({ email, username, password }) {
  clearRequestCache(currentSessionCache);
  let res;
  try {
    res = await fetch("/api/auth/wordpress/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, username, password }),
    });
  } catch {
    throw new Error(
      "Impossible de joindre l'API backend (/api/auth/wordpress/login).",
    );
  }

  const rawBody = await res.text();
  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }

  if (!res.ok) {
    const details =
      payload?.details ||
      payload?.error ||
      rawBody.slice(0, 200) ||
      `Login WordPress impossible (HTTP ${res.status}).`;
    throw new Error(details);
  }

  if (payload?.user) {
    primeCurrentSessionCache(payload.user);
  }

  return payload;
}

export async function getCurrentSessionUser({ signal } = {}) {
  const loadSession = async () => {
    const res = await fetch("/api/auth/me", {
      signal,
      credentials: "include",
      cache: "no-store",
    });

    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(payload?.error || `Auth error ${res.status}`);
    }

    return res.json();
  };

  if (signal) {
    return loadSession();
  }

  return runCachedRequest(currentSessionCache, loadSession);
}

export async function logoutSession() {
  clearRequestCache(currentSessionCache);
  const res = await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `Logout error ${res.status}`);
  }

  return res.json();
}

export async function updateCurrentSessionProfile({
  name,
  email,
  wpPassword,
  website,
  bio,
  nickname,
}) {
  const body = {
    name,
    email,
    wpPassword,
  };
  if (typeof website === "string") body.website = website;
  if (typeof bio === "string") body.bio = bio;
  if (typeof nickname === "string") body.nickname = nickname;

  const res = await fetch("/api/auth/me/profile", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });

  const rawBody = await res.text();
  let payload = {};
  try {
    payload = rawBody ? JSON.parse(rawBody) : {};
  } catch {
    payload = {};
  }

  if (!res.ok) {
    const details =
      payload?.details ||
      payload?.error ||
      rawBody.slice(0, 220) ||
      `Profil update impossible (HTTP ${res.status}).`;
    throw new Error(details);
  }

  if (payload?.user) {
    primeCurrentSessionCache(payload.user);
  }

  return payload;
}

export async function getAdminDashboardData({ signal } = {}) {
  const res = await fetch("/api/dashboard", {
    signal,
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) {
    let details = "";
    try {
      const payload = await res.json();
      details = payload?.details || payload?.error || "";
    } catch {
      // Ignore JSON parse errors and keep generic message
    }
    throw new Error(
      details ? `Admin API error ${res.status}: ${details}` : `Admin API error ${res.status}`,
    );
  }
  return res.json();
}

export async function getSitePhaseState({ signal } = {}) {
  const loadSitePhaseState = async () => {
    const { payload } = await fetchSameOriginWithFallback(
      ["/api/site-phase", "/MarsAi/api/site-phase"],
      {
        signal,
        cache: "no-store",
        credentials: "include",
      },
      "Site phase API",
    );

    return payload;
  };

  if (signal) {
    return loadSitePhaseState();
  }

  return runCachedRequest(sitePhaseCache, loadSitePhaseState);
}

export async function updateSitePhaseState({ currentPhase, mode } = {}) {
  const { payload } = await fetchSameOriginWithFallback(
    ["/api/site-phase", "/MarsAi/api/site-phase"],
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        currentPhase,
        mode,
      }),
    },
    "Site phase API",
  );

  clearRequestCache(sitePhaseCache);
  return payload;
}

export async function getPhase2SelectionStatus({ signal } = {}) {
  try {
    const { payload } = await fetchSameOriginWithFallback(
      ["/api/site-phase/phase2-selection", "/MarsAi/api/site-phase/phase2-selection"],
      {
        signal,
        cache: "no-store",
        credentials: "include",
      },
      "Phase 2 selection API",
    );

    return payload;
  } catch (error) {
    const message = String(error?.message || "");
    if (/\b404\b/.test(message)) {
      return {
        selectedCount: 0,
        minRequired: 50,
        selectedMovies: [],
        isReadyBySuperadmin: false,
        readyBy: null,
        readyByName: null,
        readyAt: null,
      };
    }
    throw error;
  }
}

export async function patchPhase2Selection(movieId, selected) {
  const { payload } = await fetchSameOriginWithFallback(
    ["/api/site-phase/phase2-selection", "/MarsAi/api/site-phase/phase2-selection"],
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ movieId, selected }),
    },
    "Phase 2 selection API",
  );

  clearRequestCache(sitePhaseCache);
  return payload;
}

export async function validatePhase2Selection() {
  const { payload } = await fetchSameOriginWithFallback(
    ["/api/site-phase/phase2-selection/validate", "/MarsAi/api/site-phase/phase2-selection/validate"],
    {
      method: "POST",
      credentials: "include",
    },
    "Phase 2 selection API",
  );

  clearRequestCache(sitePhaseCache);
  return payload;
}

export async function getPhase3SelectionStatus({ signal } = {}) {
  try {
    const { payload } = await fetchSameOriginWithFallback(
      ["/api/site-phase/phase3-selection", "/MarsAi/api/site-phase/phase3-selection"],
      {
        signal,
        cache: "no-store",
        credentials: "include",
      },
      "Phase 3 selection API",
    );

    return payload;
  } catch (error) {
    const message = String(error?.message || "");
    if (/\b404\b/.test(message)) {
      return {
        selectedCount: 0,
        minRequired: 5,
        selectedMovies: [],
        isReadyBySuperadmin: false,
        readyBy: null,
        readyByName: null,
        readyAt: null,
      };
    }
    throw error;
  }
}

export async function getPhase3WinnersPublic({ signal } = {}) {
  const { payload } = await fetchSameOriginWithFallback(
    ["/api/site-phase/phase3-winners", "/MarsAi/api/site-phase/phase3-winners"],
    {
      signal,
      cache: "no-store",
      credentials: "include",
    },
    "Phase 3 winners API",
  );

  return payload;
}

export async function patchPhase3Selection(movieId, selected) {
  const { payload } = await fetchSameOriginWithFallback(
    ["/api/site-phase/phase3-selection", "/MarsAi/api/site-phase/phase3-selection"],
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ movieId, selected }),
    },
    "Phase 3 selection API",
  );

  clearRequestCache(sitePhaseCache);
  return payload;
}

export async function validatePhase3Selection() {
  const { payload } = await fetchSameOriginWithFallback(
    ["/api/site-phase/phase3-selection/validate", "/MarsAi/api/site-phase/phase3-selection/validate"],
    {
      method: "POST",
      credentials: "include",
    },
    "Phase 3 selection API",
  );

  clearRequestCache(sitePhaseCache);
  return payload;
}

export async function getMyAssignments() {
  const res = await fetch("/api/assignments/my", {
    credentials: "include",
    cache: "no-store",
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.details || payload?.error || `Assignments API error ${res.status}`);
  }
  return payload;
}

export async function claimMovieAssignment(movieId) {
  const res = await fetch("/api/assignments/claim", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ movieId }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.details || payload?.error || `Claim API error ${res.status}`);
  }
  return payload;
}

export async function releaseMovieAssignment(movieId) {
  const res = await fetch("/api/assignments/release", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ movieId }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.details || payload?.error || `Release API error ${res.status}`);
  }
  return payload;
}

export async function autoAssignMovieReviews() {
  const res = await fetch("/api/assignments/auto-assign", {
    method: "POST",
    credentials: "include",
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.details || payload?.error || `Auto-assign API error ${res.status}`);
  }
  return payload;
}

export async function rebalanceMovieReviews() {
  const res = await fetch("/api/assignments/rebalance", {
    method: "POST",
    credentials: "include",
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.details || payload?.error || `Rebalance API error ${res.status}`);
  }
  return payload;
}

export async function getMyMovieRating(movieId) {
  const res = await fetch(`/api/ratings/${movieId}/me`, {
    credentials: "include",
    cache: "no-store",
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.details || payload?.error || `Rating API error ${res.status}`);
  }
  return payload;
}

export async function upsertMyMovieRating(movieId, score, comment = "") {
  const res = await fetch(`/api/ratings/${movieId}/me`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ score, comment }),
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.details || payload?.error || `Rating API error ${res.status}`);
  }
  return payload;
}

export async function deleteMyMovieRating(movieId) {
  const res = await fetch(`/api/ratings/${movieId}/me/delete`, {
    method: "POST",
    credentials: "include",
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(payload?.details || payload?.error || `Rating API error ${res.status}`);
  }
  return payload;
}
