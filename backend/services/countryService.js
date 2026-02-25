function toCountryFlagPath(flagPath, alpha2) {
  const alpha2Value = String(alpha2 || "").trim().toLowerCase();
  const fallbackPath = alpha2Value ? `/images/flags/${alpha2Value}.png` : "";
  const raw = String(flagPath || "").trim();
  if (!raw) return fallbackPath;
  if (/^https?:\/\//i.test(raw)) return raw;

  let normalized = raw.startsWith("/") ? raw : `/${raw}`;
  normalized = normalized.replace(/\/images\/flags\/png100px\//i, "/images/flags/");

  if (!/\.(png|jpg|jpeg|webp|svg)$/i.test(normalized) && alpha2Value) {
    normalized = `/images/flags/${alpha2Value}.png`;
  }

  return normalized || fallbackPath;
}

export function mapCountriesForUpload(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const alpha2 = String(row.alpha2 || "").trim().toUpperCase();
    return {
      id: Number(row.id),
      alpha2,
      nameFr: String(row.name_fr || "").trim(),
      nameEn: String(row.name_eng || "").trim(),
      flagPath: toCountryFlagPath(row.flag_path, alpha2),
    };
  });
}

