import { resolveCountryFlagPath } from "./countryFlagPath.js";

export function mapCountriesForUpload(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const alpha2 = String(row.alpha2 || "").trim().toUpperCase();
    return {
      id: Number(row.id),
      alpha2,
      nameFr: String(row.name_fr || "").trim(),
      nameEn: String(row.name_eng || "").trim(),
      flagPath: resolveCountryFlagPath(row.flag_path, alpha2),
    };
  });
}

