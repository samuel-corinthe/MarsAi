import express from "express";
import { getDbPool } from "../db.js";

const router = express.Router();

let schemaReadyPromise = null;

async function ensureSchema(pool) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS movie_admin_ratings (
          id INT(11) NOT NULL AUTO_INCREMENT,
          movie_id INT(11) NOT NULL,
          admin_id INT(11) NOT NULL,
          score TINYINT(1) NOT NULL,
          created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_movie_admin_rating (movie_id, admin_id),
          KEY idx_movie_admin_ratings_movie (movie_id),
          KEY idx_movie_admin_ratings_admin (admin_id),
          CONSTRAINT fk_movie_admin_ratings_movie
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
          CONSTRAINT fk_movie_admin_ratings_admin
            FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  await schemaReadyPromise;
}

function toMovieId(rawValue) {
  const movieId = Number(rawValue);
  return Number.isFinite(movieId) && movieId > 0 ? movieId : null;
}

function toScore(rawValue) {
  const score = Number(rawValue);
  if (!Number.isFinite(score)) return null;
  if (!Number.isInteger(score)) return null;
  if (score < 1 || score > 5) return null;
  return score;
}

router.get("/:movieId/me", async (req, res) => {
  const adminId = Number(req.auth?.userId);
  const movieId = toMovieId(req.params.movieId);

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  const pool = getDbPool();

  try {
    await ensureSchema(pool);

    const [[movieRows], [ratingRows], [summaryRows]] = await Promise.all([
      pool.query("SELECT id FROM movies WHERE id = ? LIMIT 1", [movieId]),
      pool.query(
        `
          SELECT score
          FROM movie_admin_ratings
          WHERE movie_id = ? AND admin_id = ?
          LIMIT 1
        `,
        [movieId, adminId],
      ),
      pool.query(
        `
          SELECT COUNT(*) AS total, AVG(score) AS avg_score
          FROM movie_admin_ratings
          WHERE movie_id = ?
        `,
        [movieId],
      ),
    ]);

    if (!movieRows.length) {
      return res.status(404).json({ error: "Film introuvable." });
    }

    const myScore = ratingRows.length ? Number(ratingRows[0].score) : null;
    const totalRatings = Number(summaryRows?.[0]?.total || 0);
    const avgScoreRaw = summaryRows?.[0]?.avg_score;
    const avgScore = avgScoreRaw == null ? null : Number(avgScoreRaw);

    return res.json({
      ok: true,
      movieId,
      myScore,
      summary: {
        totalRatings,
        avgScore,
      },
    });
  } catch (error) {
    console.error("[RATINGS] get my rating error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger la note du film.",
      details: error.message,
    });
  }
});

router.patch("/:movieId/me", async (req, res) => {
  const adminId = Number(req.auth?.userId);
  const movieId = toMovieId(req.params.movieId);
  const score = toScore(req.body?.score);

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }
  if (!score) {
    return res.status(400).json({ error: "score invalide (1-5)." });
  }

  const pool = getDbPool();
  const connection = await pool.getConnection();

  try {
    await ensureSchema(pool);
    await connection.beginTransaction();

    const [movieRows] = await connection.query(
      "SELECT id FROM movies WHERE id = ? LIMIT 1 FOR UPDATE",
      [movieId],
    );
    if (!movieRows.length) {
      await connection.rollback();
      return res.status(404).json({ error: "Film introuvable." });
    }

    await connection.query(
      `
        INSERT INTO movie_admin_ratings (movie_id, admin_id, score)
        VALUES (?, ?, ?)
        ON DUPLICATE KEY UPDATE score = VALUES(score)
      `,
      [movieId, adminId, score],
    );

    await connection.commit();

    return res.json({
      ok: true,
      movieId,
      score,
    });
  } catch (error) {
    await connection.rollback();
    console.error("[RATINGS] upsert rating error:", error.message);
    return res.status(500).json({
      error: "Impossible d'enregistrer la note.",
      details: error.message,
    });
  } finally {
    connection.release();
  }
});

router.post("/:movieId/me/delete", async (req, res) => {
  const adminId = Number(req.auth?.userId);
  const movieId = toMovieId(req.params.movieId);

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  const pool = getDbPool();

  try {
    await ensureSchema(pool);

    await pool.query(
      `
        DELETE FROM movie_admin_ratings
        WHERE movie_id = ? AND admin_id = ?
      `,
      [movieId, adminId],
    );

    return res.json({
      ok: true,
      movieId,
      deleted: true,
    });
  } catch (error) {
    console.error("[RATINGS] delete rating error:", error.message);
    return res.status(500).json({
      error: "Impossible de supprimer la note.",
      details: error.message,
    });
  }
});

export default router;
