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
const WP_AUTH_MODE = String(process.env.WP_AUTH_MODE || "auto")
  .trim()
  .toLowerCase();
const WP_FALLBACK_ROLE = String(process.env.WP_FALLBACK_ROLE || "")
  .trim()
  .toLowerCase();

function decodeHtmlEntities(value = "") {
  return String(value)
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function isLikelyEmail(value = "") {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value).trim());
}

function extractSelectedDisplayName(profileHtml = "") {
  const selectMatch = String(profileHtml).match(
    /<select[^>]*name=["']display_name["'][^>]*>([\s\S]*?)<\/select>/i,
  );
  if (!selectMatch) return "";

  const optionsHtml = selectMatch[1];
  const selectedMatch =
    optionsHtml.match(/<option[^>]*selected[^>]*value=["']([^"']+)["'][^>]*>/i) ||
    optionsHtml.match(/<option[^>]*value=["']([^"']+)["'][^>]*selected[^>]*>/i) ||
    optionsHtml.match(/<option[^>]*selected[^>]*>([^<]+)<\/option>/i);

  if (selectedMatch?.[1]) {
    return decodeHtmlEntities(selectedMatch[1]).trim();
  }

  const firstOptionMatch =
    optionsHtml.match(/<option[^>]*value=["']([^"']+)["'][^>]*>/i) ||
    optionsHtml.match(/<option[^>]*>([^<]+)<\/option>/i);
  return decodeHtmlEntities(firstOptionMatch?.[1] || "").trim();
}

function pickDisplayName(candidates = []) {
  for (const candidate of candidates) {
    const value = String(candidate || "").trim();
    if (value) return value;
  }
  return "";
}

function escapeRegExp(value = "") {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function extractInputValue(html = "", fieldName = "") {
  const field = escapeRegExp(fieldName);
  const patterns = [
    new RegExp(`name=["']${field}["'][^>]*value=["']([^"']*)["']`, "i"),
    new RegExp(`id=["']${field}["'][^>]*value=["']([^"']*)["']`, "i"),
    new RegExp(`value=["']([^"']*)["'][^>]*name=["']${field}["']`, "i"),
    new RegExp(`value=["']([^"']*)["'][^>]*id=["']${field}["']`, "i"),
  ];

  for (const pattern of patterns) {
    const match = String(html).match(pattern);
    if (match?.[1] != null) {
      return decodeHtmlEntities(match[1]).trim();
    }
  }

  return "";
}

function extractTextareaValue(html = "", fieldName = "") {
  const field = escapeRegExp(fieldName);
  const match = String(html).match(
    new RegExp(`<textarea[^>]*name=["']${field}["'][^>]*>([\\s\\S]*?)<\\/textarea>`, "i"),
  );
  return decodeHtmlEntities(match?.[1] || "").trim();
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

async function authenticateWpFormSession({ identifier, password }) {
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

  return {
    cookieJar,
    cookieHeader,
    profileHtml,
  };
}

async function extractWpIdentityFromProfile({ profileHtml, cookieHeader, identifier }) {
  const userIdMatch = profileHtml.match(/name=["']user_id["'][^>]*value=["'](\d+)["']/i);
  const emailMatch = profileHtml.match(/name=["']email["'][^>]*value=["']([^"']+)["']/i);
  const firstNameMatch = profileHtml.match(
    /name=["']first_name["'][^>]*value=["']([^"']*)["']/i,
  );
  const lastNameMatch = profileHtml.match(
    /name=["']last_name["'][^>]*value=["']([^"']*)["']/i,
  );
  const nicknameMatch = profileHtml.match(/name=["']nickname["'][^>]*value=["']([^"']*)["']/i);
  const userLoginMatch =
    profileHtml.match(/id=["']user_login["'][^>]*value=["']([^"']+)["']/i) ||
    profileHtml.match(/name=["']user_login["'][^>]*value=["']([^"']+)["']/i);

  const firstName = decodeHtmlEntities(firstNameMatch?.[1] || "").trim();
  const lastName = decodeHtmlEntities(lastNameMatch?.[1] || "").trim();
  const nickname = decodeHtmlEntities(nicknameMatch?.[1] || "").trim();
  const userLogin = decodeHtmlEntities(userLoginMatch?.[1] || "").trim();
  const displayNameFromProfile = extractSelectedDisplayName(profileHtml);
  const email =
    decodeHtmlEntities(emailMatch?.[1] || "") ||
    (String(identifier).includes("@") ? identifier : `${identifier}@wordpress.local`);
  const fullName = `${firstName} ${lastName}`.trim();
  const displayName = pickDisplayName([
    fullName,
    displayNameFromProfile,
    nickname,
    userLogin,
    !isLikelyEmail(identifier) ? identifier : "",
    email,
  ]);
  const username = String(userLogin || nickname || identifier).trim();

  const roleClassMatch = profileHtml.match(/role-([a-z0-9_-]+)/i);
  const roleFromProfile = String(roleClassMatch?.[1] || "").toLowerCase();

  let wpRoles = [];
  if (roleFromProfile === "administrator") {
    wpRoles = ["administrator"];
  } else if (roleFromProfile === "editor") {
    wpRoles = ["editor"];
  } else {
    const isSuperAdmin = await hasWpAdminAccess("/wp-admin/options-general.php", cookieHeader);
    const isEditor = await hasWpAdminAccess("/wp-admin/edit-comments.php", cookieHeader);
    wpRoles = isSuperAdmin ? ["administrator"] : isEditor ? ["editor"] : [];
  }

  if (!wpRoles.length && ["administrator", "editor"].includes(WP_FALLBACK_ROLE)) {
    wpRoles = [WP_FALLBACK_ROLE];
  }

  if (!wpRoles.length) {
    wpRoles = ["visitor"];
  }

  return {
    wpUserId: Number(userIdMatch?.[1] || 0),
    username,
    displayName,
    email,
    wpRoles,
  };
}

async function tryWpLoginFormIdentity({ identifier, password }) {
  const session = await authenticateWpFormSession({ identifier, password });
  if (!session) return null;

  return extractWpIdentityFromProfile({
    profileHtml: session.profileHtml,
    cookieHeader: session.cookieHeader,
    identifier,
  });
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
  if (!parts.length) return { firstName: "WordPress", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return {
    firstName: parts[0],
    lastName: parts.slice(1).join(" "),
  };
}

async function getLocalRoleByEmail(email) {
  if (!email) return null;
  try {
    const pool = getDbPool();
    const [rows] = await pool.query(
      "SELECT role FROM users WHERE email = ? LIMIT 1",
      [email],
    );
    const role = String(rows?.[0]?.role || "").toLowerCase();
    return ["admin", "superadmin"].includes(role) ? role : null;
  } catch {
    return null;
  }
}

async function fetchWordPressIdentity({ identifier, password }) {
  if (!WP_BASE_URL) {
    throw new Error("WP_BASE_URL manquant dans .env");
  }

  const normalizedPassword = String(password || "").replace(/\s+/g, "");
  const allowRestAuth = WP_AUTH_MODE !== "form";
  const allowFormFallback = WP_AUTH_MODE !== "rest";

  if (!allowRestAuth) {
    const formIdentity = await tryWpLoginFormIdentity({
      identifier,
      password: normalizedPassword,
    });
    if (formIdentity) {
      return formIdentity;
    }
    throw new Error(
      "WordPress a refuse l'authentification (mode form). Verifie email/username et mot de passe WordPress.",
    );
  }

  const basic = Buffer.from(`${identifier}:${normalizedPassword}`).toString("base64");
  const headers = {
    Authorization: `Basic ${basic}`,
    Accept: "application/json",
  };

  let response;
  let rawBody = "";
  let parsedBody = null;
  try {
    response = await fetch(`${WP_BASE_URL}/wp-json/wp/v2/users/me?context=edit`, {
      method: "GET",
      headers,
    });
    rawBody = await response.text();
    try {
      parsedBody = JSON.parse(rawBody || "{}");
    } catch {
      parsedBody = null;
    }
  } catch (error) {
    if (allowFormFallback) {
      const formIdentity = await tryWpLoginFormIdentity({
        identifier,
        password: normalizedPassword,
      });
      if (formIdentity) {
        return formIdentity;
      }
    }
    throw new Error(`Connexion WordPress REST impossible: ${error.message}`);
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

  if (response.status === 404) {
    throw new Error(
      `Endpoint WordPress introuvable (${WP_BASE_URL}/wp-json/wp/v2/users/me). Verifie WP_BASE_URL.`,
    );
  }

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
  if (![401, 403].includes(response.status)) {
    hints.push(`REST /users/me a repondu HTTP ${response.status}.`);
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

  if (allowFormFallback) {
    const formIdentity = await tryWpLoginFormIdentity({
      identifier,
      password: normalizedPassword,
    });
    if (formIdentity) {
      return formIdentity;
    }
    hints.push("Fallback wp-login classique bloque ou identifiants invalides.");
  }

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

function toWpRolesValue(wpRoles = []) {
  if (!Array.isArray(wpRoles)) return null;
  const value = wpRoles.map((role) => String(role || "").trim()).filter(Boolean).join(",");
  return value || null;
}

function toWpColumns(wpIdentity = {}) {
  const wpUserIdValue = Number(wpIdentity?.wpUserId || 0);
  const wpUserId = Number.isFinite(wpUserIdValue) && wpUserIdValue > 0 ? wpUserIdValue : null;

  return {
    wpUserId,
    wpUsername: String(wpIdentity?.username || "").trim() || null,
    wpDisplayName: String(wpIdentity?.displayName || "").trim() || null,
    wpRolesValue: toWpRolesValue(wpIdentity?.wpRoles),
  };
}

async function updateWordPressProfileViaForm({ identifier, password, profile }) {
  const session = await authenticateWpFormSession({ identifier, password });
  if (!session) {
    throw new Error("Authentification WordPress invalide. Verifie ton mot de passe WordPress.");
  }

  const { cookieJar, cookieHeader, profileHtml } = session;
  const nonce = extractInputValue(profileHtml, "_wpnonce");
  const userId = extractInputValue(profileHtml, "user_id");
  const referer = extractInputValue(profileHtml, "_wp_http_referer") || "/wp-admin/profile.php";
  const from = extractInputValue(profileHtml, "from") || "profile";
  const checkuserId = extractInputValue(profileHtml, "checkuser_id") || "1";
  const action = extractInputValue(profileHtml, "action") || "update";

  if (!nonce || !userId) {
    throw new Error("Impossible de trouver les champs de securite du profil WordPress.");
  }

  const currentFirstName = extractInputValue(profileHtml, "first_name");
  const currentLastName = extractInputValue(profileHtml, "last_name");
  const currentNickname =
    extractInputValue(profileHtml, "nickname") || extractInputValue(profileHtml, "user_nickname");
  const currentUserLogin = extractInputValue(profileHtml, "user_login");
  const currentDisplayName = extractSelectedDisplayName(profileHtml);
  const currentEmail = extractInputValue(profileHtml, "email");
  const currentUrl = extractInputValue(profileHtml, "url");
  const currentDescription = extractTextareaValue(profileHtml, "description");

  const nextFirstName = String(profile?.firstName ?? currentFirstName).trim();
  const nextLastName = String(profile?.lastName ?? currentLastName).trim();
  const nextEmail = String(profile?.email ?? currentEmail).trim();
  const nextNickname = pickDisplayName([
    String(profile?.nickname || "").trim(),
    currentNickname,
    currentUserLogin,
    nextFirstName,
    identifier,
  ]);
  const nextDisplayName = pickDisplayName([
    String(profile?.displayName || "").trim(),
    `${nextFirstName} ${nextLastName}`.trim(),
    currentDisplayName,
    nextNickname,
    currentUserLogin,
    nextEmail,
  ]);
  const nextUrl = String(profile?.url ?? currentUrl).trim();
  const nextDescription = String(profile?.description ?? currentDescription).trim();

  if (!nextEmail) {
    throw new Error("Email WordPress requis pour mettre a jour le profil.");
  }
  if (!nextNickname) {
    throw new Error("Pseudonyme WordPress requis pour mettre a jour le profil.");
  }
  if (!nextDisplayName) {
    throw new Error("Nom a afficher WordPress requis pour mettre a jour le profil.");
  }

  const updateBody = new URLSearchParams({
    _wpnonce: nonce,
    _wp_http_referer: referer,
    from,
    checkuser_id: checkuserId,
    user_id: userId,
    action,
    first_name: nextFirstName,
    last_name: nextLastName,
    nickname: nextNickname,
    display_name: nextDisplayName,
    email: nextEmail,
    url: nextUrl,
    description: nextDescription,
  });

  const updateResponse = await fetch(`${WP_BASE_URL}/wp-admin/profile.php`, {
    method: "POST",
    redirect: "manual",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "text/html",
      Referer: `${WP_BASE_URL}/wp-admin/profile.php`,
      Cookie: cookieHeader,
    },
    body: updateBody.toString(),
  });
  mergeCookies(cookieJar, updateResponse);

  const location = (updateResponse.headers.get("location") || "").toLowerCase();
  if (location.includes("wp-login.php")) {
    throw new Error("Session WordPress expiree pendant la mise a jour du profil.");
  }

  if (![200, 302, 303].includes(updateResponse.status)) {
    const rawBody = await updateResponse.text();
    throw new Error(
      `Mise a jour profile WordPress en echec (HTTP ${updateResponse.status}): ${rawBody
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 180)}`,
    );
  }

  const refreshedIdentity = await tryWpLoginFormIdentity({ identifier, password });
  if (!refreshedIdentity) {
    throw new Error("Profil WordPress mis a jour, mais impossible de relire les informations.");
  }

  return refreshedIdentity;
}

async function upsertLocalUser({ email, displayName, appRole, wpIdentity }) {
  const pool = getDbPool();
  const { firstName, lastName } = splitDisplayName(displayName);
  const { wpUserId, wpUsername, wpDisplayName, wpRolesValue } = toWpColumns(wpIdentity);

  let existingRows = [];
  if (wpUserId) {
    const [rowsByWpId] = await pool.query("SELECT id FROM users WHERE wp_user_id = ? LIMIT 1", [
      wpUserId,
    ]);
    existingRows = rowsByWpId;
  }
  if (!existingRows.length) {
    const [rowsByEmail] = await pool.query("SELECT id FROM users WHERE email = ? LIMIT 1", [email]);
    existingRows = rowsByEmail;
  }

  if (existingRows.length) {
    const userId = Number(existingRows[0].id);
    await pool.query(
      `
        UPDATE users
        SET email = ?,
            first_name = ?,
            last_name = ?,
            role = ?,
            wp_user_id = ?,
            wp_username = ?,
            wp_display_name = ?,
            wp_roles = ?,
            wp_last_sync_at = NOW()
        WHERE id = ?
      `,
      [email, firstName, lastName, appRole, wpUserId, wpUsername, wpDisplayName, wpRolesValue, userId],
    );
    return userId;
  }

  const placeholderPassword = "WP_SSO_MANAGED_ACCOUNT";
  const [insertResult] = await pool.query(
    `
      INSERT INTO users (
        email,
        password,
        first_name,
        last_name,
        role,
        wp_user_id,
        wp_username,
        wp_display_name,
        wp_roles,
        wp_last_sync_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `,
    [email, placeholderPassword, firstName, lastName, appRole, wpUserId, wpUsername, wpDisplayName, wpRolesValue],
  );

  return Number(insertResult.insertId);
}

async function updateLocalUserFromWpIdentity({ userId, appRole, wpIdentity }) {
  const pool = getDbPool();
  const safeUserId = Number(userId);

  if (!Number.isFinite(safeUserId) || safeUserId <= 0) {
    return upsertLocalUser({
      email: wpIdentity.email,
      displayName: wpIdentity.displayName,
      appRole,
      wpIdentity,
    });
  }

  const { firstName, lastName } = splitDisplayName(wpIdentity.displayName);
  const { wpUserId, wpUsername, wpDisplayName, wpRolesValue } = toWpColumns(wpIdentity);

  const [result] = await pool.query(
    `
      UPDATE users
      SET email = ?,
          first_name = ?,
          last_name = ?,
          role = ?,
          wp_user_id = ?,
          wp_username = ?,
          wp_display_name = ?,
          wp_roles = ?,
          wp_last_sync_at = NOW()
      WHERE id = ?
    `,
    [
      wpIdentity.email,
      firstName,
      lastName,
      appRole,
      wpUserId,
      wpUsername,
      wpDisplayName,
      wpRolesValue,
      safeUserId,
    ],
  );

  if (Number(result?.affectedRows || 0) > 0) {
    return safeUserId;
  }

  return upsertLocalUser({
    email: wpIdentity.email,
    displayName: wpIdentity.displayName,
    appRole,
    wpIdentity,
  });
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
    let appRole = mapWpRolesToAppRole(wpIdentity.wpRoles);

    if (appRole === "visitor") {
      if (["administrator", "superadmin"].includes(WP_FALLBACK_ROLE)) {
        appRole = "superadmin";
      } else if (["editor", "admin"].includes(WP_FALLBACK_ROLE)) {
        appRole = "admin";
      }
    }

    if (appRole === "visitor") {
      const localRole = await getLocalRoleByEmail(wpIdentity.email);
      if (localRole) {
        appRole = localRole;
      }
    }

    if (appRole === "visitor") {
      return res.status(403).json({
        error:
          "Votre compte WordPress n'a pas les droits dashboard (roles acceptes: administrator, editor).",
        details: `roles detectes: ${(wpIdentity.wpRoles || []).join(", ") || "aucun"}`,
      });
    }

    const userId = await upsertLocalUser({
      email: wpIdentity.email,
      displayName: wpIdentity.displayName,
      appRole,
      wpIdentity,
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
    const wpAuthStatusMatch = message.match(/WordPress a refuse l'authentification \((\d{3})/i);
    const wpAuthStatus = Number(wpAuthStatusMatch?.[1] || 0);
    const isDbError =
      /ER_[A-Z_]+/i.test(message) ||
      message.includes("Access denied for user") ||
      message.includes("Unknown database") ||
      message.includes("No database selected") ||
      message.includes("Can't connect to MySQL server") ||
      message.includes("Too many connections") ||
      message.includes("Lost connection to MySQL server");
    const isWpTransportError =
      message.includes("fetch failed") ||
      message.includes("ENOTFOUND") ||
      message.includes("ECONNREFUSED") ||
      message.includes("ECONNRESET") ||
      message.includes("CERT_") ||
      message.includes("self signed certificate") ||
      message.includes("Connexion WordPress REST impossible");

    const statusCode = message.includes("WP_BASE_URL manquant")
      ? 500
      : message.includes("Endpoint WordPress introuvable")
        ? 502
        : (wpAuthStatus >= 500 && wpAuthStatus < 600) ||
            message.includes("WordPress auth error") ||
            isWpTransportError
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

router.patch("/me/profile", requireAuth, async (req, res) => {
  const session = req.auth || {};
  const requestBody = req.body || {};
  const { name, email, wpPassword, website, bio, nickname } = requestBody;

  const nextName = String(name || "").trim();
  const nextEmail = String(email || session.email || "").trim().toLowerCase();
  const providedWpPassword = String(wpPassword || "");
  const hasWebsite = Object.prototype.hasOwnProperty.call(requestBody, "website");
  const hasBio = Object.prototype.hasOwnProperty.call(requestBody, "bio");
  const hasNickname = Object.prototype.hasOwnProperty.call(requestBody, "nickname");
  const normalizedWebsite = hasWebsite ? String(website || "").trim() : undefined;
  const normalizedBio = hasBio ? String(bio || "").trim() : undefined;
  const normalizedNickname = hasNickname ? String(nickname || "").trim() : undefined;

  if (!nextName || !nextEmail) {
    return res.status(400).json({
      error: "name et email sont requis.",
    });
  }

  if (!providedWpPassword) {
    return res.status(400).json({
      error: "Le mot de passe WordPress est requis pour synchroniser le profil.",
    });
  }

  const wpIdentifier = String(session.wpUsername || session.email || nextEmail).trim();
  if (!wpIdentifier) {
    return res.status(400).json({
      error: "Impossible de determiner l'identifiant WordPress pour la synchronisation.",
    });
  }

  const { firstName, lastName } = splitDisplayName(nextName);

  try {
    const wpIdentity = await updateWordPressProfileViaForm({
      identifier: wpIdentifier,
      password: providedWpPassword,
      profile: {
        firstName,
        lastName,
        displayName: nextName,
        email: nextEmail,
        url: normalizedWebsite,
        description: normalizedBio,
        nickname: normalizedNickname,
      },
    });

    let appRole = mapWpRolesToAppRole(wpIdentity.wpRoles);
    if (appRole === "visitor" && ["admin", "superadmin"].includes(String(session.role || ""))) {
      appRole = session.role;
    }

    if (appRole === "visitor") {
      return res.status(403).json({
        error:
          "Votre compte WordPress n'a pas les droits dashboard (roles acceptes: administrator, editor).",
        details: `roles detectes: ${(wpIdentity.wpRoles || []).join(", ") || "aucun"}`,
      });
    }

    const localUserId = await updateLocalUserFromWpIdentity({
      userId: session.userId,
      appRole,
      wpIdentity,
    });

    const sessionPayload = buildSessionPayload({
      userId: localUserId,
      appRole,
      wpIdentity,
    });
    setSessionCookie(res, sessionPayload);

    return res.json({
      ok: true,
      user: {
        id: localUserId,
        role: appRole,
        email: wpIdentity.email,
        name: wpIdentity.displayName,
        wpUsername: wpIdentity.username,
        wpRoles: wpIdentity.wpRoles || [],
      },
    });
  } catch (error) {
    console.error("[AUTH] Echec sync profil WordPress:", error.message);
    const message = String(error.message || "");
    const isDbError =
      /ER_[A-Z_]+/i.test(message) ||
      message.includes("Access denied for user") ||
      message.includes("Unknown database") ||
      message.includes("No database selected") ||
      message.includes("Can't connect to MySQL server") ||
      message.includes("Too many connections") ||
      message.includes("Lost connection to MySQL server");

    const statusCode = message.includes("Authentification WordPress invalide")
      ? 401
      : message.includes("Session WordPress expiree")
        ? 401
        : isDbError
          ? 500
          : 502;

    return res.status(statusCode).json({
      error: "Impossible de synchroniser le profil avec WordPress.",
      details: message,
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
