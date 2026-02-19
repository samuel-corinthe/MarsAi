export async function findAllMovies(pool) {
  const [rows] = await pool.query(
    `
      SELECT
        m.*,
        c.alpha2 AS country_alpha2,
        c.name_fr AS country_name_fr,
        c.name_eng AS country_name_eng,
        c.flag_path AS country_flag_path
      FROM movies m
      LEFT JOIN countries c ON c.id = m.country_id
      ORDER BY m.id DESC
    `,
  );

  return rows;
}

export async function findMovieById(pool, movieId) {
  const [rows] = await pool.query(
    `
      SELECT
        m.*,
        c.alpha2 AS country_alpha2,
        c.name_fr AS country_name_fr,
        c.name_eng AS country_name_eng,
        c.flag_path AS country_flag_path
      FROM movies m
      LEFT JOIN countries c ON c.id = m.country_id
      WHERE m.id = ?
      LIMIT 1
    `,
    [movieId],
  );

  return rows[0] || null;
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
