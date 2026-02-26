import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import "../env.js";
import { getDbPool } from "../db.js";
import {
  getObjectStorageMissingEnv,
  isObjectStorageConfigured,
  uploadFileToObjectStorage,
} from "../services/objectStorageService.js";

const SUPPORTED_FIELDS = ["video_url", "poster_url"];

function parseArgs(argv) {
  const options = {
    dryRun: false,
    limit: 0,
  };

  for (const token of argv) {
    if (token === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (token.startsWith("--limit=")) {
      const raw = Number.parseInt(token.split("=")[1], 10);
      if (Number.isFinite(raw) && raw > 0) {
        options.limit = raw;
      }
    }
  }

  return options;
}

function extractUploadsRelativePath(rawValue) {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;

  let pathname = raw;
  if (/^https?:\/\//i.test(raw)) {
    try {
      pathname = new URL(raw).pathname || "";
    } catch {
      return null;
    }
  }

  const normalizedPath = pathname
    .replace(/\\/g, "/")
    .replace(/^\/+/, "/")
    .replace(/^\/(?:MarsAi|MarsAiFestival)\//i, "/");
  const marker = "/uploads/";
  const markerIndex = normalizedPath.toLowerCase().indexOf(marker);
  if (markerIndex < 0) return null;

  const relativePath = normalizedPath.slice(markerIndex + marker.length).replace(/^\/+/, "");
  if (!relativePath || relativePath.includes("..")) {
    return null;
  }

  return relativePath;
}

function resolveLocalFilePath(relativePath) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const candidates = [
    path.resolve(scriptDir, "..", "uploads", relativePath),
    path.resolve(scriptDir, "..", "..", "uploads", relativePath),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function buildUpdateQuery(updates, movieId) {
  const fields = Object.keys(updates);
  if (fields.length === 0) return null;

  const setClause = fields.map((field) => `${field} = ?`).join(", ");
  const params = fields.map((field) => updates[field]);
  params.push(movieId);

  return {
    sql: `UPDATE movies SET ${setClause} WHERE id = ?`,
    params,
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!isObjectStorageConfigured()) {
    console.error(
      `[migrate-local-media-to-s3] S3 non configure: ${getObjectStorageMissingEnv().join(", ")}`,
    );
    process.exit(1);
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();
  const uploadedByPath = new Map();
  const summary = {
    inspectedMovies: 0,
    migratedMovies: 0,
    migratedAssets: 0,
    missingLocalFiles: 0,
    skippedAssets: 0,
    failedAssets: 0,
  };

  try {
    const [rows] = await connection.query(
      `
        SELECT id, title, video_url, poster_url
        FROM movies
        ORDER BY id ASC
      `,
    );

    const movieRows = Array.isArray(rows) ? rows : [];
    let processedMovies = 0;

    for (const row of movieRows) {
      if (options.limit > 0 && processedMovies >= options.limit) {
        break;
      }

      const movieId = Number(row.id);
      if (!Number.isFinite(movieId) || movieId <= 0) continue;

      summary.inspectedMovies += 1;
      const updates = {};
      let movieAssetMigrated = 0;

      for (const field of SUPPORTED_FIELDS) {
        const sourceUrl = String(row[field] || "").trim();
        const relativePath = extractUploadsRelativePath(sourceUrl);
        if (!relativePath) {
          summary.skippedAssets += 1;
          continue;
        }

        const localFilePath = resolveLocalFilePath(relativePath);
        if (!localFilePath) {
          summary.missingLocalFiles += 1;
          continue;
        }

        if (options.dryRun) {
          movieAssetMigrated += 1;
          summary.migratedAssets += 1;
          continue;
        }

        try {
          let uploaded = uploadedByPath.get(localFilePath);
          if (!uploaded) {
            uploaded = await uploadFileToObjectStorage({
              localFilePath,
              objectKey: relativePath,
            });
            uploadedByPath.set(localFilePath, uploaded);
          }

          updates[field] = uploaded.url;
          movieAssetMigrated += 1;
          summary.migratedAssets += 1;
        } catch (error) {
          summary.failedAssets += 1;
          console.error(
            `[migrate-local-media-to-s3] movie_id=${movieId} field=${field} erreur:`,
            error?.message || error,
          );
        }
      }

      if (movieAssetMigrated > 0) {
        summary.migratedMovies += 1;
        if (!options.dryRun) {
          const query = buildUpdateQuery(updates, movieId);
          if (query) {
            await connection.query(query.sql, query.params);
          }
        }
      }

      processedMovies += 1;
    }

    console.log("[migrate-local-media-to-s3] resume:", summary);
    if (options.dryRun) {
      console.log("[migrate-local-media-to-s3] mode dry-run: aucune ecriture en base.");
    }
  } catch (error) {
    console.error("[migrate-local-media-to-s3] erreur fatale:", error?.message || error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();
