export async function findAllMovies(pool) {
  await ensurePhase3MovieCategoriesSchema(pool);
  const [rows] = await pool.query(
    `
      SELECT
        m.*,
        c.alpha2 AS country_alpha2,
        c.name_fr AS country_name_fr,
        c.name_eng AS country_name_eng,
        c.name_ar AS country_name_ar,
        c.flag_path AS country_flag_path,
        phase3_categories.categories AS categories,
        COALESCE(r.avg_rating, 0) AS avg_rating,
        COALESCE(r.notes_count, 0) AS notes_count
      FROM movies m
      LEFT JOIN countries c ON c.id = m.country_id
      LEFT JOIN (
        SELECT
          movie_id,
          GROUP_CONCAT(category_name ORDER BY sort_order ASC, id ASC SEPARATOR ',') AS categories
        FROM phase3_movie_categories
        GROUP BY movie_id
      ) phase3_categories ON phase3_categories.movie_id = m.id
      LEFT JOIN (
        SELECT
          movie_id,
          AVG(score) AS avg_rating,
          COUNT(*) AS notes_count
        FROM movie_admin_ratings
        GROUP BY movie_id
      ) r ON r.movie_id = m.id
      ORDER BY m.id DESC
    `,
  );

  return rows;
}

export async function findMovieById(pool, movieId) {
  await ensurePhase3MovieCategoriesSchema(pool);
  const [rows] = await pool.query(
    `
      SELECT
        m.*,
        c.alpha2 AS country_alpha2,
        c.name_fr AS country_name_fr,
        c.name_eng AS country_name_eng,
        c.name_ar AS country_name_ar,
        c.flag_path AS country_flag_path,
        phase3_categories.categories AS categories,
        COALESCE(r.avg_rating, 0) AS avg_rating,
        COALESCE(r.notes_count, 0) AS notes_count
      FROM movies m
      LEFT JOIN countries c ON c.id = m.country_id
      LEFT JOIN (
        SELECT
          movie_id,
          GROUP_CONCAT(category_name ORDER BY sort_order ASC, id ASC SEPARATOR ',') AS categories
        FROM phase3_movie_categories
        GROUP BY movie_id
      ) phase3_categories ON phase3_categories.movie_id = m.id
      LEFT JOIN (
        SELECT
          movie_id,
          AVG(score) AS avg_rating,
          COUNT(*) AS notes_count
        FROM movie_admin_ratings
        GROUP BY movie_id
      ) r ON r.movie_id = m.id
      WHERE m.id = ?
      LIMIT 1
    `,
    [movieId],
  );

  return rows[0] || null;
}

export async function updateMovieYoutubeUrl(pool, movieId, youtubeUrl) {
  const [result] = await pool.query(
    `
      UPDATE movies
      SET youtube_url = ?
      WHERE id = ?
      LIMIT 1
    `,
    [youtubeUrl, movieId],
  );

  return Number(result?.affectedRows || 0);
}

const PHASE3_MOVIE_CATEGORIES_TABLE = "phase3_movie_categories";
let ensurePhase3MovieCategoriesSchemaPromise = null;

async function ensurePhase3MovieCategoriesSchema(pool) {
  if (!ensurePhase3MovieCategoriesSchemaPromise) {
    ensurePhase3MovieCategoriesSchemaPromise = pool.query(
      `
        CREATE TABLE IF NOT EXISTS \`${PHASE3_MOVIE_CATEGORIES_TABLE}\` (
          \`id\` int(11) NOT NULL AUTO_INCREMENT,
          \`movie_id\` int(11) NOT NULL,
          \`category_name\` varchar(100) NOT NULL,
          \`sort_order\` int(11) NOT NULL DEFAULT '0',
          \`created_by\` int(11) DEFAULT NULL,
          \`created_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
          PRIMARY KEY (\`id\`),
          UNIQUE KEY \`uq_phase3_movie_category\` (\`movie_id\`, \`category_name\`),
          KEY \`idx_phase3_movie_categories_movie\` (\`movie_id\`, \`sort_order\`, \`id\`),
          KEY \`idx_phase3_movie_categories_created_by\` (\`created_by\`),
          CONSTRAINT \`fk_phase3_movie_categories_movie\` FOREIGN KEY (\`movie_id\`) REFERENCES \`movies\` (\`id\`) ON DELETE CASCADE,
          CONSTRAINT \`fk_phase3_movie_categories_created_by\` FOREIGN KEY (\`created_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
      `,
    ).catch((error) => {
      ensurePhase3MovieCategoriesSchemaPromise = null;
      throw error;
    });
  }

  await ensurePhase3MovieCategoriesSchemaPromise;
}

export async function listPhase3MovieCategories(pool, movieId) {
  await ensurePhase3MovieCategoriesSchema(pool);
  const [rows] = await pool.query(
    `
      SELECT category_name
      FROM \`${PHASE3_MOVIE_CATEGORIES_TABLE}\`
      WHERE movie_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [movieId],
  );

  return rows
    .map((row) => String(row.category_name || "").trim())
    .filter(Boolean);
}

export async function replacePhase3MovieCategories(pool, movieId, categories, createdBy = null) {
  await ensurePhase3MovieCategoriesSchema(pool);

  const safeCategories = Array.isArray(categories) ? categories : [];
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();
    await connection.query(
      `DELETE FROM \`${PHASE3_MOVIE_CATEGORIES_TABLE}\` WHERE movie_id = ?`,
      [movieId],
    );

    if (safeCategories.length > 0) {
      const placeholders = safeCategories.map(() => "(?, ?, ?, ?)").join(", ");
      const params = safeCategories.flatMap((categoryName, index) => [
        movieId,
        categoryName,
        index,
        createdBy,
      ]);

      await connection.query(
        `
          INSERT INTO \`${PHASE3_MOVIE_CATEGORIES_TABLE}\`
            (movie_id, category_name, sort_order, created_by)
          VALUES ${placeholders}
        `,
        params,
      );
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function findCastByMovieId(pool, movieId) {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        movie_id,
        person_name,
        role_name,
        avatar_url,
        sort_order
      FROM movie_cast
      WHERE movie_id = ?
      ORDER BY sort_order ASC, id ASC
    `,
    [movieId],
  );

  return rows;
}

export async function findCastByMovieIds(pool, movieIds) {
  if (!Array.isArray(movieIds) || movieIds.length === 0) {
    return [];
  }

  const placeholders = movieIds.map(() => "?").join(", ");
  const [rows] = await pool.query(
    `
      SELECT
        id,
        movie_id,
        person_name,
        role_name,
        avatar_url,
        sort_order
      FROM movie_cast
      WHERE movie_id IN (${placeholders})
      ORDER BY movie_id ASC, sort_order ASC, id ASC
    `,
    movieIds,
  );

  return rows;
}
