import { getDbPool } from "../db.js";
import { findAllMovies } from "../models/movieModel.js";

const CSV_COLUMNS = [
  ["id", "id"],
  ["title", "title"],
  ["submitted_by", "submitted_by"],
  ["release_year", "release_year"],
  ["release_date", "release_date"],
  ["country_name_fr", "country_name_fr"],
  ["country_name_eng", "country_name_eng"],
  ["language", "language"],
  ["submission_status", "submission_status"],
  ["avg_rating", "avg_rating"],
  ["notes_count", "notes_count"],
  ["created_at", "created_at"],
];

function sanitizeCell(value) {
  const normalized = String(value ?? "");
  return /^[=+\-@]/.test(normalized) ? `'${normalized}` : normalized;
}

function serializeCell(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }
  return sanitizeCell(value);
}

function formatCell(value) {
  return `"${serializeCell(value).replace(/"/g, '""')}"`;
}

export async function exportMoviesCSV(_req, res) {
  try {
    const movies = await findAllMovies(getDbPool());
    const headers = CSV_COLUMNS.map(([, label]) => label).join(",");
    const rows = movies.map((movie) =>
      CSV_COLUMNS.map(([key]) => formatCell(movie?.[key])).join(","));

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="movies.csv"');
    res.write("\ufeff");
    res.end([headers, ...rows].join("\n"));
  } catch (error) {
    console.error("[EXPORT_CSV] movies error:", error?.message || error);
    res.status(500).json({ error: "Erreur interne du serveur" });
  }
}
