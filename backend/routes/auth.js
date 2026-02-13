import crypto from "node:crypto";
import express from "express";
import jwt from "jsonwebtoken";
import { getDbPool } from "../db.js";

const router = express.Router();

const SESSION_COOKIE_NAME = process.env.SESSION_COOKIE_NAME || "marsai_sid";
const SESSION_TTL_SECONDS = Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 8);
const WP_BASE_URL = (process.env.WP_BASE_URL || "").replace(/\/+$/, "");
const IS_PROD = process.env.NODE_ENV === "production";
const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.JWT_SECRET ||
  `dev-session-secret-${crypto.randomBytes(8).toString("hex")}`;
const WP_LOGIN_URL = `${WP_BASE_URL}/wp-login.php`;

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function getSetCookieValues(response) {
  if (!response?.headers) return [];
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }
  const setCookie = response.headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

function mergeCookies(cookieJar, response) {
  const setCookies = getSetCookieValues(response);
  for (const cookie of setCookies) {
    const [nameValue] = String(cookie || "").split(";");
    const eqIdx = nameValue.indexOf("=");
    if (eqIdx <= 0) continue;
    const name = nameValue.slice(0, eqIdx).trim();
    const value = nameValue.slice(eqIdx + 1).trim();
    if (!name) continue;
    cookieJar.set(name, value);
  }
}

function cookieJarToHeader(cookieJar) {
  return [...cookieJar.entries()]
    .map(([name, value]) => `${name}=${value}`)
    .join("; ");
}

async function hasWpAdminAccess(pathname, cookieHeader) {
  const response = await fetch(`${WP_BASE_URL}${pathname}`, {
    method: "GET",
    redirect: "manual",
    headers: {
      Accept: "text/html",
      Cookie: cookieHeader,
    },
  });

  const location = (response.headers.get("location") || "").toLowerCase();
  if (location.includes("wp-login.php")) return false;

  const html = await response.text();
  const denied =
    /you are not allowed to access this page/i.test(html) ||
    /vous n.*autorisation/i.test(html) ||
    /forbidden/i.test(html);

  return response.ok && !denied;
}

async function tryWpLoginFormIdentity({ identifier, password }) {
  const cookieJar = new Map();

  const bootstrap = await fetch(WP_LOGIN_URL, {
    method: "GET",
    redirect: "manual",
    headers: { Accept: "text/html" },
  });
  mergeCookies(cookieJar, bootstrap);

  const loginBody = new URLSearchParams({
    log: identifier,
    pwd: String(password || ""),
    "wp-submit": "Log In",
    redirect_to: `${WP_BASE_URL}/wp-admin/`,
    testcookie: "1",
  });

  const loginResponse = await fetch(WP_LOGIN_URL, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
      Referer: WP_LOGIN_URL,
      Cookie: cookieJarToHeader(cookieJar),
    },
    body: loginBody.toString(),
  });
  mergeCookies(cookieJar, loginResponse);

  const cookieHeader = cookieJarToHeader(cookieJar);
  const hasLoggedCookie = [...cookieJar.keys()].some((name) =>
    name.startsWith("wordpress_logged_in_"),
  );
  if (!cookieHeader || !hasLoggedCookie) {
    return null;
  }

  const profileResponse = await fetch(`${WP_BASE_URL}/wp-admin/profile.php`, {
    method: "GET",
    redirect: "manual",
    headers: {
      Accept: "text/html",
      Cookie: cookieHeader,
    },
  });

  const profileLocation = (profileResponse.headers.get("location") || "").toLowerCase();
  if (profileLocation.includes("wp-login.php")) {
    return null;
  }

  const profileHtml = await profileResponse.text();
  if (!profileResponse.ok) {
    return null;
  }
  if (
    /you are not allowed to access this page/i.test(profileHtml) ||
    /forbidden/i.test(profileHtml)
  ) {
    return null;
  }

  const userIdMatch = profileHtml.match(/name=["']user_id["'][^>]*value=["'](\d+)["']/i);
  const emailMatch = profileHtml.match(/name=["']email["'][^>]*value=["']([^"']+)["']/i);
  const firstNameMatch = profileHtml.match(
    /name=["']first_name["'][^>]*value=["']([^"']*)["']/i,
  );
  const lastNameMatch = profileHtml.match(
    /name=["']last_name["'][^>]*value=["']([^"']*)["']/i,
  );

  const firstName = decodeHtmlEntities(firstNameMatch?.[1] || "");
  const lastName = decodeHtmlEntities(lastNameMatch?.[1] || "");
  const displayName = `${firstName} ${lastName}`.trim() || identifier;
  const email =
    decodeHtmlEntities(emailMatch?.[1] || "") ||
    (String(identifier).includes("@") ? identifier : `${identifier}@wordpress.local`);

  const isSuperAdmin = await hasWpAdminAccess("/wp-admin/options-general.php", cookieHeader);
  const isEditor = await hasWpAdminAccess("/wp-admin/edit-comments.php", cookieHeader);

  const wpRoles = isSuperAdmin ? ["administrator"] : isEditor ? ["editor"] : ["visitor"];

  return {
    wpUserId: Number(userIdMatch?.[1] || 0),
    username: identifier,
    displayName,
    email,
    wpRoles,
  };
}

function parseCookieHeader(cookieHeader = "") {
  return cookieHeader
    .split(";")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reduce((acc, pair) => {
      const eqIndex = pair.indexOf("=");
      if (eqIndex === -1) return acc;
      const key = pair.slice(0, eqIndex).trim();
      const value = pair.slice(eqIndex + 1).trim();
      acc[key] = value;
      return acc;
    }, {});
}

function getSessionTokenFromRequest(req) {
  const cookies = parseCookieHeader(req.headers.cookie || "");
  return cookies[SESSION_COOKIE_NAME] || "";
}

function verifySessionToken(token) {
  try {
    return jwt.verify(token, SESSION_SECRET);
  } catch {
    return null;
  }
}

function mapWpRolesToAppRole(wpRoles = []) {
  if (wpRoles.includes("administrator")) return "superadmin";
  if (wpRoles.includes("editor")) return "admin";
  return "visitor";
}

function splitDisplayName(displayName = "") {
  const parts = String(displayName).trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "WordPress", lastName: "User" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "User" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

async function fetchWordPressIdentity({ identifier, password }) {
  if (!WP_BASE_URL) {
    throw new Error("WP_BASE_URL manquant dans .env");
  }

  const normalizedPassword = String(password || "").replace(/\s+/g, "");
  const basic = Buffer.from(`${identifier}:${normalizedPassword}`).toString("base64");
  const headers = {
    Authorization: `Basic ${basic}`,
    Accept: "application/json",
  };

  const response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/users/me?context=edit`, {
    method: "GET",
    headers,
  });

  const rawBody = await response.text();
  let parsedBody = null;
  try {
    parsedBody = JSON.parse(rawBody || "{}");
  } catch {
    parsedBody = null;
  }

  if (response.ok) {
    const data = parsedBody || {};
    const roles = Array.isArray(data.roles) ? data.roles : [];
    const email = data.email || `${data.slug || identifier}@wordpress.local`;

    return {
      wpUserId: Number(data.id),
      username: data.slug || identifier,
      displayName: data.name || identifier,
      email,
      wpRoles: roles,
    };
  }

  if (response.status === 401 || response.status === 403) {
    let wpCode = String(parsedBody?.code || "");
    let wpMessage = String(parsedBody?.message || "");
    const rawSnippet = String(rawBody || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 220);

    const hints = [];
    if (wpCode === "incorrect_password") {
      hints.push("Le mot de passe WordPress est invalide (ou ce n'est pas un mot de passe d'application).");
    }
    if (wpCode === "invalid_username") {
      hints.push("Le username WordPress est invalide. Utilise l'identifiant WordPress exact.");
    }
    if (wpCode === "application_passwords_disabled") {
      hints.push("Les mots de passe d'application sont desactives sur WordPress.");
    }
    if (wpCode === "rest_not_logged_in") {
      hints.push("WordPress n'a pas accepte l'authentification Basic (plugin/securite/headers).");
    }

    const usersMeBlocked =
      response.status === 403 &&
      rawSnippet.toLowerCase().includes("/wp-json/wp/v2/users/me") &&
      rawSnippet.toLowerCase().includes("permission");

    if (usersMeBlocked) {
      const [settingsRes, commentsRes] = await Promise.all([
        fetch(`${WP_BASE_URL}/wp-json/wp/v2/settings`, {
          method: "GET",
          headers,
        }),
        fetch(`${WP_BASE_URL}/wp-json/wp/v2/comments?context=edit&per_page=1`, {
          method: "GET",
          headers,
        }),
      ]);

      if (settingsRes.ok) {
        return {
          wpUserId: 0,
          username: identifier,
          displayName: identifier,
          email: String(identifier).includes("@")
            ? identifier
            : `${identifier}@wordpress.local`,
          wpRoles: ["administrator"],
        };
      }

      if (commentsRes.ok) {
        return {
          wpUserId: 0,
          username: identifier,
          displayName: identifier,
          email: String(identifier).includes("@")
            ? identifier
            : `${identifier}@wordpress.local`,
          wpRoles: ["editor"],
        };
      }

      hints.push(
        `Fallback permissions check bloque (settings=${settingsRes.status}, comments=${commentsRes.status}).`,
      );
    }

    const formIdentity = await tryWpLoginFormIdentity({ identifier, password });
    if (formIdentity) {
      return formIdentity;
    }
    hints.push("Fallback wp-login classique bloque ou identifiants invalides.");

    throw new Error(
      [
        `WordPress a refuse l'authentification (${response.status}${wpCode ? `, code: ${wpCode}` : ""}).`,
        wpMessage ? `Message WP: ${wpMessage}.` : "",
        "Utilise ton email WordPress (ou username) + ton mot de passe WordPress.",
        hints.join(" "),
        !wpMessage && rawSnippet ? `Reponse brute WP: ${rawSnippet}` : "",
      ]
        .filter(Boolean)
        .join(" "),
    );
  }

  if (response.status === 404) {
    throw new Error(
      `Endpoint WordPress introuvable (${WP_BASE_URL}/wp-json/wp/v2/users/me). Verifie WP_BASE_URL.`,
    );
  }

  if (!response.ok) {
    throw new Error(`WordPress auth error ${response.status}: ${rawBody.slice(0, 180)}`);
  }
}

async function upsertLocalUser({ email, displayName, appRole }) {
  const pool = getDbPool();
  const { firstName, lastName } = splitDisplayName(displayName);

  const [existingRows] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);

  if (existingRows.length) {
    const userId = Number(existingRows[0].id);
    await pool.query(
      `
        UPDATE users
        SET first_name = ?, last_name = ?, role = ?
        WHERE id = ?
      `,
      [firstName, lastName, appRole, userId],
    );
    return userId;
  }

  const placeholderPassword = "WP_SSO_MANAGED_ACCOUNT";
  const [insertResult] = await pool.query(
    `
      INSERT INTO users (email, password, first_name, last_name, role)
      VALUES (?, ?, ?, ?, ?)
    `,
    [email, placeholderPassword, firstName, lastName, appRole],
  );

  return Number(insertResult.insertId);
}

function buildSessionPayload({ userId, appRole, wpIdentity }) {
  return {
    userId,
    role: appRole,
    wpUserId: wpIdentity.wpUserId,
    wpUsername: wpIdentity.username,
    wpRoles: wpIdentity.wpRoles,
    email: wpIdentity.email,
    name: wpIdentity.displayName,
  };
}

function setSessionCookie(res, payload) {
  const token = jwt.sign(payload, SESSION_SECRET, { expiresIn: SESSION_TTL_SECONDS });

  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    maxAge: SESSION_TTL_SECONDS * 1000,
    path: "/",
  });
}

function clearSessionCookie(res) {
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    path: "/",
  });
}

function getSessionFromRequest(req) {
  const token = getSessionTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

export function requireAuth(req, res, next) {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "Authentification requise." });
  }
  req.auth = session;
  return next();
}

export function requireRole(allowedRoles = []) {
  return (req, res, next) => {
    if (!req.auth) {
      return res.status(401).json({ error: "Authentification requise." });
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return res.status(403).json({ error: "Acces refuse pour ce role." });
    }
    return next();
  };
}

router.post("/wordpress/login", async (req, res) => {
  const { username, email, password } = req.body || {};
  const identifier = String(email || username || "").trim();

  if (!identifier || !password) {
    return res.status(400).json({ error: "email (ou username) et password sont requis." });
  }

  try {
    const wpIdentity = await fetchWordPressIdentity({ identifier, password });
    const appRole = mapWpRolesToAppRole(wpIdentity.wpRoles);

    if (appRole === "visitor") {
      return res.status(403).json({
        error:
          "Votre compte WordPress n'a pas les droits dashboard (roles acceptes: administrator, editor).",
      });
    }

    const userId = await upsertLocalUser({
      email: wpIdentity.email,
      displayName: wpIdentity.displayName,
      appRole,
    });

    const sessionPayload = buildSessionPayload({ userId, appRole, wpIdentity });
    setSessionCookie(res, sessionPayload);

    return res.json({
      ok: true,
      user: {
        id: userId,
        role: appRole,
        email: wpIdentity.email,
        name: wpIdentity.displayName,
        wpRoles: wpIdentity.wpRoles,
      },
    });
  } catch (error) {
    console.error("[AUTH] Echec login WordPress:", error.message);

    const message = String(error.message || "");
    const isDbError =
      /ER_[A-Z_]+/i.test(message) ||
      message.includes("Access denied for user") ||
      message.includes("Unknown database") ||
      message.includes("connect ECONNREFUSED") ||
      message.includes("No database selected");
    const isWpTransportError =
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND") ||
      message.includes("ECONNRESET") ||
      message.includes("CERT_") ||
      message.includes("self signed certificate");

    const statusCode = message.includes("WP_BASE_URL manquant")
      ? 500
      : message.includes("Endpoint WordPress introuvable")
        ? 502
        : message.includes("WordPress auth error") || isWpTransportError
          ? 502
          : isDbError
            ? 500
            : 401;

    return res.status(statusCode).json({
      error: "Connexion WordPress impossible.",
      details: error.message,
    });
  }
});

router.get("/me", (req, res) => {
  const session = getSessionFromRequest(req);
  if (!session) {
    return res.status(401).json({ error: "Aucune session active." });
  }

  return res.json({
    authenticated: true,
    user: {
      id: session.userId,
      role: session.role,
      email: session.email,
      name: session.name,
      wpUserId: session.wpUserId,
      wpUsername: session.wpUsername,
      wpRoles: session.wpRoles || [],
    },
  });
});

router.post("/logout", (req, res) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

export default router;
