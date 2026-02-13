const WP_V2 = "/wp-json/wp/v2";

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

export async function loginWithWordPress({ email, username, password }) {
  let res;
  try {
    res = await fetch("/api/auth/wordpress/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, username, password }),
    });
  } catch (error) {
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
