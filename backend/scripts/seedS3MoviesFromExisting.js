import crypto from "node:crypto";
import "../env.js";
import { getDbPool } from "../db.js";
import {
  getObjectStorageSummary,
  isObjectStorageConfigured,
} from "../services/objectStorageService.js";

const INSERT_MOVIE_SQL = `
  INSERT INTO movies (
    title,
    age,
    bio,
    social_links,
    synopsis,
    duration,
    release_year,
    country_id,
    language,
    subtitle_language,
    ai_tools,
    poster_url,
    video_url,
    youtube_url,
    view_count,
    submitted_by,
    submission_status
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

const DEFAULTS = {
  count: 150,
  sourceLimit: 20,
  prefix: "Demo S3",
  submittedBy: "SEED_S3_DEMO",
  status: "en cours",
};

function toSafeInt(value, fallback, min = 1, max = 1000) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function parseArgs(argv) {
  const args = {
    count: DEFAULTS.count,
    sourceLimit: DEFAULTS.sourceLimit,
    prefix: DEFAULTS.prefix,
    submittedBy: DEFAULTS.submittedBy,
    status: DEFAULTS.status,
    cleanup: false,
  };

  for (const token of argv) {
    if (token === "--cleanup") {
      args.cleanup = true;
      continue;
    }

    if (token.startsWith("--count=")) {
      args.count = toSafeInt(token.split("=")[1], DEFAULTS.count, 1, 5000);
      continue;
    }

    if (token.startsWith("--source-limit=")) {
      args.sourceLimit = toSafeInt(token.split("=")[1], DEFAULTS.sourceLimit, 1, 500);
      continue;
    }

    if (token.startsWith("--prefix=")) {
      const value = String(token.split("=").slice(1).join("=")).trim();
      if (value) args.prefix = value;
      continue;
    }

    if (token.startsWith("--submitted-by=")) {
      const value = String(token.split("=").slice(1).join("=")).trim();
      if (value) args.submittedBy = value;
      continue;
    }

    if (token.startsWith("--status=")) {
      const value = String(token.split("=").slice(1).join("=")).trim();
      if (value) args.status = value;
    }
  }

  return args;
}

function withUniqueQuery(rawUrl, token) {
  const value = String(rawUrl || "").trim();
  if (!value) return "";

  try {
    const parsed = new URL(value);
    parsed.searchParams.set("dup", token);
    return parsed.toString();
  } catch {
    const separator = value.includes("?") ? "&" : "?";
    return `${value}${separator}dup=${encodeURIComponent(token)}`;
  }
}

function buildYoutubeId(seed) {
  const digest = crypto.createHash("sha256").update(seed).digest("base64url");
  const sanitized = digest.replace(/[^A-Za-z0-9_-]/g, "");
  return sanitized.slice(0, 11).padEnd(11, "A");
}

function buildYoutubeUrl(rawYoutubeUrl, token) {
  const baseUrl = String(rawYoutubeUrl || "").trim();
  if (baseUrl) {
    return withUniqueQuery(baseUrl, token);
  }

  return `https://www.youtube.com/watch?v=${buildYoutubeId(token)}`;
}

function toStringOrNull(value) {
  const safeValue = String(value ?? "").trim();
  return safeValue || null;
}

function toNumberOrFallback(value, fallback, min = 0) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, parsed);
}

function buildInsertPayload({
  sourceMovie,
  index,
  prefix,
  submittedBy,
  status,
}) {
  const token = `${Date.now().toString(36)}-${index + 1}-${crypto.randomBytes(4).toString("hex")}`;
  const title = `${prefix} ${String(index + 1).padStart(3, "0")} - ${String(sourceMovie.title || "Film").trim()}`;

  return [
    title,
    toNumberOrFallback(sourceMovie.age, 18, 0),
    toStringOrNull(sourceMovie.bio),
    toStringOrNull(sourceMovie.social_links),
    toStringOrNull(sourceMovie.synopsis) || `Film de demonstration #${index + 1}`,
    toNumberOrFallback(sourceMovie.duration, 60, 1),
    toNumberOrFallback(sourceMovie.release_year, new Date().getFullYear(), 1900),
    toNumberOrFallback(sourceMovie.country_id, 75, 1),
    toStringOrNull(sourceMovie.language) || "Français",
    toStringOrNull(sourceMovie.subtitle_language),
    toStringOrNull(sourceMovie.ai_tools) || "Suno",
    withUniqueQuery(sourceMovie.poster_url, token),
    withUniqueQuery(sourceMovie.video_url, token),
    buildYoutubeUrl(sourceMovie.youtube_url, token),
    0,
    submittedBy,
    status,
  ];
}

async function runCleanup(connection, submittedBy) {
  const [result] = await connection.query(
    "DELETE FROM movies WHERE submitted_by = ?",
    [submittedBy],
  );
  return Number(result?.affectedRows || 0);
}

async function loadSourceMovies(connection, sourceLimit, publicUrlPrefix) {
  const [rows] = await connection.query(
    `
      SELECT *
      FROM movies
      WHERE video_url LIKE ?
      ORDER BY id DESC
      LIMIT ?
    `,
    [`${publicUrlPrefix}%`, sourceLimit],
  );

  return Array.isArray(rows) ? rows : [];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!isObjectStorageConfigured()) {
    console.error("[seed-s3-movies] S3 non configure dans .env");
    process.exit(1);
  }

  const objectStorageSummary = getObjectStorageSummary();
  const publicUrlPrefix = String(objectStorageSummary?.publicUrlPrefix || "").trim();
  if (!publicUrlPrefix) {
    console.error("[seed-s3-movies] publicUrlPrefix S3 introuvable.");
    process.exit(1);
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    if (options.cleanup) {
      await connection.beginTransaction();
      const deleted = await runCleanup(connection, options.submittedBy);
      await connection.commit();
      console.log(
        `[seed-s3-movies] cleanup OK -> ${deleted} film(s) supprime(s) pour submitted_by="${options.submittedBy}"`,
      );
      return;
    }

    const sourceMovies = await loadSourceMovies(connection, options.sourceLimit, publicUrlPrefix);
    if (sourceMovies.length === 0) {
      throw new Error(
        `Aucun film source S3 trouve (prefix attendu: ${publicUrlPrefix}).`,
      );
    }

    await connection.beginTransaction();
    let inserted = 0;

    for (let i = 0; i < options.count; i += 1) {
      const sourceMovie = sourceMovies[i % sourceMovies.length];
      const payload = buildInsertPayload({
        sourceMovie,
        index: i,
        prefix: options.prefix,
        submittedBy: options.submittedBy,
        status: options.status,
      });

      await connection.query(INSERT_MOVIE_SQL, payload);
      inserted += 1;
    }

    await connection.commit();
    console.log(
      `[seed-s3-movies] seed OK -> ${inserted} film(s) inseres depuis ${sourceMovies.length} source(s) S3 (submitted_by="${options.submittedBy}")`,
    );
  } catch (error) {
    await connection.rollback();
    console.error("[seed-s3-movies] erreur:", error?.message || error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
