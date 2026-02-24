import crypto from "node:crypto";
import "../env.js";
import { getDbPool } from "../db.js";

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
  count: 120,
  prefix: "Film Test",
  submittedBy: "SEED_TEST_BOT",
};

function toSafeInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseArgs(argv) {
  const args = {
    count: DEFAULTS.count,
    prefix: DEFAULTS.prefix,
    submittedBy: DEFAULTS.submittedBy,
    cleanup: false,
  };

  for (const token of argv) {
    if (token === "--cleanup") {
      args.cleanup = true;
      continue;
    }
    if (token.startsWith("--count=")) {
      args.count = Math.max(1, Math.min(1000, toSafeInt(token.split("=")[1], DEFAULTS.count)));
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
    }
  }

  return args;
}

function buildYoutubeId(seed) {
  const digest = crypto.createHash("sha256").update(seed).digest("base64url");
  const sanitized = digest.replace(/[^A-Za-z0-9_-]/g, "");
  return sanitized.slice(0, 11).padEnd(11, "A");
}

function buildMoviePayload({ index, prefix, submittedBy, countryId }) {
  const seed = `${Date.now()}-${process.pid}-${index}-${crypto.randomBytes(6).toString("hex")}`;
  const title = `${prefix} ${String(index + 1).padStart(3, "0")}`;
  const youtubeId = buildYoutubeId(seed);
  const releaseYear = 2010 + (index % 17);
  const duration = 40 + (index % 75);

  return [
    title,
    16 + (index % 10), // age
    "Film de test genere automatiquement pour valider les phases.",
    JSON.stringify({
      instagram: "https://instagram.com/marsai_test",
      website: "https://example.com/marsai-test",
    }),
    `Synopsis de test #${index + 1} pour valider les flux de selection.`,
    duration,
    releaseYear,
    countryId,
    "Français",
    index % 3 === 0 ? "Anglais" : null,
    "Runway, Midjourney",
    `https://picsum.photos/seed/seed-${seed}/600/900`,
    `https://cdn.example.com/videos/seed-${seed}.mp4`,
    `https://www.youtube.com/watch?v=${youtubeId}`,
    0,
    submittedBy,
    "en cours",
  ];
}

async function getCountryId(connection) {
  const [rows] = await connection.query("SELECT id FROM countries ORDER BY id ASC LIMIT 1");
  if (!rows.length) {
    throw new Error("Aucun pays disponible dans la table countries.");
  }
  return Number(rows[0].id);
}

async function runCleanup(connection, submittedBy) {
  const [result] = await connection.query(
    "DELETE FROM movies WHERE submitted_by = ?",
    [submittedBy],
  );
  return Number(result?.affectedRows || 0);
}

async function runSeed(connection, options) {
  const countryId = await getCountryId(connection);
  let inserted = 0;

  for (let i = 0; i < options.count; i += 1) {
    const payload = buildMoviePayload({
      index: i,
      prefix: options.prefix,
      submittedBy: options.submittedBy,
      countryId,
    });
    await connection.query(INSERT_MOVIE_SQL, payload);
    inserted += 1;
  }

  return inserted;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    if (options.cleanup) {
      await connection.beginTransaction();
      const deleted = await runCleanup(connection, options.submittedBy);
      await connection.commit();
      console.log(
        `[seed-test-movies] cleanup OK -> ${deleted} film(s) supprime(s) pour submitted_by="${options.submittedBy}"`,
      );
      return;
    }

    await connection.beginTransaction();
    const inserted = await runSeed(connection, options);
    await connection.commit();
    console.log(
      `[seed-test-movies] seed OK -> ${inserted} film(s) insere(s) (prefix="${options.prefix}", submitted_by="${options.submittedBy}")`,
    );
  } catch (error) {
    await connection.rollback();
    console.error("[seed-test-movies] erreur:", error?.message || error);
    process.exitCode = 1;
  } finally {
    connection.release();
    await pool.end();
  }
}

main();

