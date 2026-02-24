import "../env.js";
import { getDbPool } from "../db.js";
import {
  deleteObjectByKey,
  extractObjectKeyFromPublicUrl,
  getObjectStorageMissingEnv,
  isObjectStorageConfigured,
  isPublicObjectStorageUrl,
  listObjectKeysByPrefix,
} from "../services/objectStorageService.js";

function parseArgs(argv) {
  return {
    dryRun: argv.includes("--dry-run"),
  };
}

async function fetchReferencedObjectKeys(pool) {
  const [rows] = await pool.query(`
    SELECT
      video_url,
      poster_url
    FROM movies
  `);

  const keys = new Set();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const videoUrl = String(row?.video_url || "").trim();
    const posterUrl = String(row?.poster_url || "").trim();

    if (videoUrl && isPublicObjectStorageUrl(videoUrl)) {
      const key = extractObjectKeyFromPublicUrl(videoUrl);
      if (key) keys.add(key);
    }
    if (posterUrl && isPublicObjectStorageUrl(posterUrl)) {
      const key = extractObjectKeyFromPublicUrl(posterUrl);
      if (key) keys.add(key);
    }
  });

  return keys;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (!isObjectStorageConfigured()) {
    console.error(
      `[prune-orphan-s3-media] S3 non configure: ${getObjectStorageMissingEnv().join(", ")}`,
    );
    process.exit(1);
  }

  const pool = getDbPool();
  try {
    const referencedKeys = await fetchReferencedObjectKeys(pool);
    const [videoKeys, posterKeys] = await Promise.all([
      listObjectKeysByPrefix("videos"),
      listObjectKeysByPrefix("posters"),
    ]);
    const candidateKeys = [...videoKeys, ...posterKeys];
    const orphanKeys = candidateKeys.filter((key) => !referencedKeys.has(key));

    let deleted = 0;
    let failed = 0;
    const failures = [];

    for (const key of orphanKeys) {
      if (options.dryRun) continue;
      try {
        await deleteObjectByKey(key);
        deleted += 1;
      } catch (error) {
        failed += 1;
        failures.push({
          key,
          error: String(error?.message || error || "Delete failed"),
        });
      }
    }

    console.log("[prune-orphan-s3-media] resume:", {
      dryRun: options.dryRun,
      referenced: referencedKeys.size,
      scanned: candidateKeys.length,
      orphanFound: orphanKeys.length,
      deleted,
      failed,
      failures: failures.slice(0, 25),
    });
  } catch (error) {
    console.error("[prune-orphan-s3-media] erreur:", error?.message || error);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
