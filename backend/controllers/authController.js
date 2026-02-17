import {
  WP_FALLBACK_ROLE,
  fetchWordPressIdentity,
  mapWpRolesToAppRole,
  getLocalRoleByEmail,
  upsertLocalUser,
  buildSessionPayload,
  setSessionCookie,
  updateWordPressProfileViaForm,
  updateLocalUserFromWpIdentity,
  splitDisplayName,
  getSessionFromRequest,
  clearSessionCookie,
} from "../services/authService.js";

export async function wordpressLogin(req, res) {
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
}

export async function updateMeProfile(req, res) {
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
    const isEmailConflict = message.startsWith("EMAIL_CONFLICT:");
    const isDbError =
      /ER_[A-Z_]+/i.test(message) ||
      message.includes("Access denied for user") ||
      message.includes("Unknown database") ||
      message.includes("No database selected") ||
      message.includes("Can't connect to MySQL server") ||
      message.includes("Too many connections") ||
      message.includes("Lost connection to MySQL server") ||
      message.includes("Duplicate entry");

    const statusCode = isEmailConflict
      ? 409
      : message.includes("Authentification WordPress invalide")
      ? 401
      : message.includes("Session WordPress expiree")
        ? 401
        : isDbError
          ? 500
          : 502;

    const clientMessage = isEmailConflict
      ? "Cette adresse email est deja utilisee par un autre compte local."
      : "Impossible de synchroniser le profil avec WordPress.";
    const clientDetails = isEmailConflict
      ? message.replace("EMAIL_CONFLICT:", "email_conflict:")
      : message || "Erreur inconnue lors de la synchronisation du profil.";

    return res.status(statusCode).json({
      error: clientMessage,
      details: clientDetails,
    });
  }
}

export function getMe(req, res) {
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
}

export function logout(req, res) {
  clearSessionCookie(res);
  return res.json({ ok: true });
}
