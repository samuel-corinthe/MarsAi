const WP_V2 = "/wp-json/wp/v2";

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

async function fetchWith404Fallback(urls, options = {}) {
  const withDeploymentPaths = appendDeploymentPathCandidates(urls);
  const candidates = appendLocalCandidates(withDeploymentPaths);

  let lastStatus = 404;
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

  if (lastError && !lastStatus) {
    throw lastError;
  }

  throw new Error(lastPayload?.details || lastPayload?.error || `Movies API error ${lastStatus}`);
}

export const getPageBySlug = async (slug, lang = "fr") => {
  const response = await fetch(
    `https://samuel-corinthe.students-laplateforme.io/MarsAi/wp-json/wp/v2/pages?slug=${slug}&lang=${lang}`,
  );
  const data = await response.json();
  return data[0];
};

export async function getAgendaPosts() {
  const res = await fetch("/wp-json/wp/v2/posts?per_page=100");
  if (!res.ok) throw new Error(`WP error ${res.status}`);
  return await res.json();
}

export async function getMovies() {
  const { payload } = await fetchWith404Fallback(
    ["/api/movies", "/api/movie"],
    { cache: "no-store" },
  );

  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.movies)) return payload.movies;
  return [];
}

export async function getMovieById(movieId) {
  const { payload } = await fetchWith404Fallback(
    [`/api/movies/${movieId}`, `/api/movie/${movieId}`],
    { cache: "no-store" },
  );

  if (payload?.movie && typeof payload.movie === "object") return payload.movie;
  if (payload && typeof payload === "object" && Number.isFinite(Number(payload.id))) return payload;
  return null;
}

export async function loginWithWordPress({ email, username, password }) {
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
      "Impossible de joindre l'API backend (/api/auth/wordpress/login). Verifie que le serveur Node est demarre.",
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

  return payload;
}

export async function getCurrentSessionUser() {
  const res = await fetch("/api/auth/me", {
    credentials: "include",
    cache: "no-store",
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => ({}));
    throw new Error(payload?.error || `Auth error ${res.status}`);
  }

  return res.json();
}

export async function logoutSession() {
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
