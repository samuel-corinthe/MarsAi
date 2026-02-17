let schemaReadyPromise = null;

export async function ensureRatingSchema(pool) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS movie_admin_ratings (
          id INT(11) NOT NULL AUTO_INCREMENT,
          movie_id INT(11) NOT NULL,
          admin_id INT(11) NOT NULL,
          score TINYINT(1) NOT NULL,
          comment TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP NULL DEFAULT NULL,
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

      const [commentColumnRows] = await pool.query(
        `
          SELECT COUNT(*) AS total
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'movie_admin_ratings'
            AND COLUMN_NAME = 'comment'
        `,
      );

      const hasCommentColumn = Number(commentColumnRows?.[0]?.total || 0) > 0;
      if (!hasCommentColumn) {
        await pool.query(
          "ALTER TABLE movie_admin_ratings ADD COLUMN comment TEXT NULL AFTER score",
        );
      }

      const [updatedAtColumnRows] = await pool.query(
        `
          SELECT COUNT(*) AS total
          FROM INFORMATION_SCHEMA.COLUMNS
          WHERE TABLE_SCHEMA = DATABASE()
            AND TABLE_NAME = 'movie_admin_ratings'
            AND COLUMN_NAME = 'updated_at'
        `,
      );

      const hasUpdatedAtColumn = Number(updatedAtColumnRows?.[0]?.total || 0) > 0;
      if (!hasUpdatedAtColumn) {
        await pool.query(
          "ALTER TABLE movie_admin_ratings ADD COLUMN updated_at TIMESTAMP NULL DEFAULT NULL AFTER created_at",
        );
      }
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  await schemaReadyPromise;
}

export async function findMovieById(pool, movieId) {
  const [rows] = await pool.query("SELECT id FROM movies WHERE id = ? LIMIT 1", [movieId]);
  return rows[0] || null;
}

export async function findMovieByIdForUpdate(connection, movieId) {
  const [rows] = await connection.query(
    "SELECT id FROM movies WHERE id = ? LIMIT 1 FOR UPDATE",
    [movieId],
  );
  return rows[0] || null;
}

export async function findAdminRatingByMovie(pool, movieId, adminId) {
  const [rows] = await pool.query(
    `
      SELECT score, comment
      FROM movie_admin_ratings
      WHERE movie_id = ? AND admin_id = ?
      LIMIT 1
    `,
    [movieId, adminId],
  );

  return rows[0] || null;
}

export async function findMovieRatingsSummary(pool, movieId) {
  const [rows] = await pool.query(
    `
      SELECT COUNT(*) AS total, AVG(score) AS avg_score
      FROM movie_admin_ratings
      WHERE movie_id = ?
    `,
    [movieId],
  );

  return rows[0] || { total: 0, avg_score: null };
}

export async function upsertAdminRating(connection, { movieId, adminId, score, comment }) {
  await connection.query(
    `
      INSERT INTO movie_admin_ratings (movie_id, admin_id, score, comment)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        score = VALUES(score),
        comment = VALUES(comment),
        updated_at = CURRENT_TIMESTAMP
    `,
    [movieId, adminId, score, comment],
  );
}

export async function deleteAdminRating(pool, movieId, adminId) {
  await pool.query(
    `
      DELETE FROM movie_admin_ratings
      WHERE movie_id = ? AND admin_id = ?
    `,
    [movieId, adminId],
  );
}
