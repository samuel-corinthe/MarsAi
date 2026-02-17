import { ensureRatingSchema } from "./ratingModel.js";

export async function ensureDashboardSchema(pool) {
  await ensureRatingSchema(pool);
}

export async function fetchAdminUsers(pool) {
  const [rows] = await pool.query(
    "SELECT id, first_name, last_name, email, role FROM users ORDER BY id ASC",
  );
  return rows;
}

export async function fetchDashboardMovies(pool, adminId) {
  const [rows] = await pool.query(
    `
      SELECT
        m.id,
        m.title,
        m.duration,
        m.ai_tools,
        m.submission_status,
        c.name_fr,
        c.name_eng,
        myr.score AS my_score,
        myr.comment AS my_comment,
        COUNT(ar.id) AS notes_count,
        AVG(ar.score) AS avg_rating,
        MAX(CASE WHEN ase.id IS NULL THEN 0 ELSE 1 END) AS is_selected
      FROM movies m
      LEFT JOIN countries c ON c.id = m.country_id
      LEFT JOIN movie_admin_ratings ar ON ar.movie_id = m.id
      LEFT JOIN movie_admin_ratings myr ON myr.movie_id = m.id AND myr.admin_id = ?
      LEFT JOIN admin_selections ase ON ase.movie_id = m.id
      GROUP BY
        m.id,
        m.title,
        m.duration,
        m.ai_tools,
        m.submission_status,
        c.name_fr,
        c.name_eng,
        myr.score,
        myr.comment
      ORDER BY m.id DESC
      LIMIT 200
    `,
    [adminId],
  );

  return rows;
}

export async function fetchNotedCount(pool, adminId) {
  const [rows] = await pool.query(
    "SELECT COUNT(*) AS total FROM movie_admin_ratings WHERE admin_id = ?",
    [adminId],
  );
  return Number(rows?.[0]?.total || 0);
}

export async function fetchSelectionCount(pool) {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM admin_selections");
  return Number(rows?.[0]?.total || 0);
}

export async function fetchMoviesTotal(pool) {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM movies");
  return Number(rows?.[0]?.total || 0);
}

export async function fetchAdminLogs(pool) {
  const [rows] = await pool.query(
    `
      SELECT
        l.action_type,
        l.target_table,
        l.target_id,
        l.description,
        u.first_name,
        u.last_name
      FROM admin_logs l
      LEFT JOIN users u ON u.id = l.admin_id
      ORDER BY l.action_date DESC
      LIMIT 20
    `,
  );

  return rows;
}

export async function fetchNewsletterCount(pool) {
  const [rows] = await pool.query("SELECT COUNT(*) AS total FROM newsletter_subs");
  return Number(rows?.[0]?.total || 0);
}
