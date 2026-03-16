export function resolveCountryFlagPath(flagPath = "", alpha2 = "") {
  const alpha2Value = String(alpha2 || "").trim().toLowerCase();
  const fallbackPath = alpha2Value ? `/images/flags/${alpha2Value}.png` : "";
  const raw = String(flagPath || "").trim();

  if (!raw) return fallbackPath;
  if (/^https?:\/\//i.test(raw)) return raw;

  let normalizedPath = raw.startsWith("/") ? raw : `/${raw}`;
  normalizedPath = normalizedPath.replace(/\/images\/flags\/png100px\//i, "/images/flags/");

  if (!/\.(png|jpg|jpeg|webp|svg)$/i.test(normalizedPath) && alpha2Value) {
    normalizedPath = fallbackPath;
  }

  return normalizedPath || fallbackPath;
}
