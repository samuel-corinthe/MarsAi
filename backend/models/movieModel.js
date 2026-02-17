export async function findAllMovies(pool) {
  const [rows] = await pool.query(
    `
      SELECT *
      FROM movies
      ORDER BY id DESC
    `,
  );

  return rows;
}

export async function findMovieById(pool, movieId) {
  const [rows] = await pool.query(
    `
      SELECT *
      FROM movies
      WHERE id = ?
      LIMIT 1
    `,
    [movieId],
  );

  return rows[0] || null;
}
