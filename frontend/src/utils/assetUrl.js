function normalizeBasePath(value = "/") {
  const raw = String(value || "").trim();
  if (!raw || raw === "/") return "/";
  const prefixed = raw.startsWith("/") ? raw : `/${raw}`;
  return prefixed.endsWith("/") ? prefixed : `${prefixed}/`;
}

export function resolvePublicAssetPath(input = "") {
  const raw = String(input || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;

  const basePath = normalizeBasePath(import.meta.env.BASE_URL || "/");
  const withLeadingSlash = raw.startsWith("/") ? raw : `/${raw}`;

  if (basePath !== "/" && withLeadingSlash.startsWith(basePath)) {
    return withLeadingSlash;
  }

  const relativePart = withLeadingSlash.replace(/^\/+/, "");
  return `${basePath}${relativePart}`;
}
