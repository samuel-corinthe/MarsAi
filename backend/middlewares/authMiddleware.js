import { getSessionFromRequest } from "../services/authService.js";

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
