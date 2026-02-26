export function normalizeBasePath(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;
  return withLeadingSlash.replace(/\/+$/, "");
}

function normalizeApiOrigin(value = "") {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw.replace(/\/+$/, "");
}

const KNOWN_DEPLOYMENT_PREFIXES = new Set(["marsai", "marsaifestival"]);

function detectKnownPrefixFromLocation() {
  if (typeof window === "undefined") return "";

  const pathname = String(window.location?.pathname || "/");
  const segments = pathname.split("/").filter(Boolean);
  const first = String(segments[0] || "");
  if (!first) return "";

  if (KNOWN_DEPLOYMENT_PREFIXES.has(first.toLowerCase())) {
    return `/${first}`;
  }

  return "";
}

export function getDeploymentBasePath() {
  const configuredApiBase = normalizeBasePath(import.meta.env.VITE_API_BASE_PATH || "");
  if (configuredApiBase) return configuredApiBase;

  const configuredAppBase = normalizeBasePath(
    import.meta.env.VITE_APP_BASE_PATH || import.meta.env.BASE_URL || "",
  );
  if (configuredAppBase && configuredAppBase !== "/") return configuredAppBase;

  return detectKnownPrefixFromLocation();
}

export function buildApiPath(path) {
  const safePath = String(path || "").startsWith("/") ? String(path) : `/${path || ""}`;
  const basePath = getDeploymentBasePath();
  const relativePath = basePath ? `${basePath}${safePath}` : safePath;
  const apiOrigin = normalizeApiOrigin(import.meta.env.VITE_API_ORIGIN || "");
  return apiOrigin ? `${apiOrigin}${relativePath}` : relativePath;
}

export function withDeploymentBase(path) {
  const raw = String(path || "").trim();
  if (!raw) return "";
  if (/^https?:\/\//i.test(raw)) return raw;
  if (/^\/(?:MarsAi|MarsAiFestival)\//i.test(raw)) return raw;

  const safePath = raw.startsWith("/") ? raw : `/${raw}`;
  const basePath = getDeploymentBasePath();
  return basePath ? `${basePath}${safePath}` : safePath;
}

export function stripDeploymentPrefix(path) {
  const raw = String(path || "");
  return raw.replace(/^\/(?:MarsAi|MarsAiFestival)\//i, "/");
}
