import { getDbPool } from "../db.js";

const ACTIVE_MOVIES_WHERE = "submission_status != 'refusé'";
const ACTIVE_MOVIES_WHERE_ALIAS = "m.submission_status != 'refusé'";

export async function getPublicStats(req, res) {
  const pool = getDbPool();

  try {
    const [[globalRow]] = await pool.query(`
      SELECT
        COUNT(*) AS total_films,
        COUNT(DISTINCT country_id) AS total_countries,
        COALESCE(SUM(duration), 0) AS total_minutes,
        COALESCE(ROUND(AVG(duration), 0), 0) AS avg_minutes,
        COUNT(
          CASE
            WHEN subtitle_language IS NOT NULL AND subtitle_language != '' THEN 1
          END
        ) AS films_with_subtitles
      FROM movies
      WHERE ${ACTIVE_MOVIES_WHERE}
    `);

    const [languages] = await pool.query(`
      SELECT language, COUNT(*) AS count
      FROM movies
      WHERE ${ACTIVE_MOVIES_WHERE}
        AND language IS NOT NULL
        AND language != ''
      GROUP BY language
      ORDER BY count DESC
    `);

    const [subtitleLanguages] = await pool.query(`
      SELECT subtitle_language AS language, COUNT(*) AS count
      FROM movies
      WHERE ${ACTIVE_MOVIES_WHERE}
        AND subtitle_language IS NOT NULL
        AND subtitle_language != ''
      GROUP BY subtitle_language
      ORDER BY count DESC
    `);

    const [ageGroups] = await pool.query(`
      SELECT age_range, COUNT(*) AS count, sort_order
      FROM (
        SELECT
          CASE
            WHEN age IS NULL THEN 'Age non renseigne'
            WHEN age < 25 THEN 'Moins de 25 ans'
            WHEN age BETWEEN 25 AND 35 THEN '25 - 35 ans'
            WHEN age BETWEEN 36 AND 45 THEN '36 - 45 ans'
            WHEN age BETWEEN 46 AND 55 THEN '46 - 55 ans'
            ELSE '55 ans et plus'
          END AS age_range,
          CASE
            WHEN age IS NULL THEN 99
            WHEN age < 25 THEN 1
            WHEN age BETWEEN 25 AND 35 THEN 2
            WHEN age BETWEEN 36 AND 45 THEN 3
            WHEN age BETWEEN 46 AND 55 THEN 4
            ELSE 5
          END AS sort_order
        FROM movies
        WHERE ${ACTIVE_MOVIES_WHERE}
      ) grouped_movies
      GROUP BY age_range, sort_order
      ORDER BY sort_order ASC
    `);

    const [countries] = await pool.query(`
      SELECT c.alpha2, c.name_fr, COUNT(m.id) AS film_count
      FROM movies m
      JOIN countries c ON c.id = m.country_id
      WHERE ${ACTIVE_MOVIES_WHERE_ALIAS}
      GROUP BY c.alpha2, c.name_fr
      ORDER BY film_count DESC, c.name_fr ASC
    `);

    const [aiToolsRaw] = await pool.query(`
      SELECT ai_tools
      FROM movies
      WHERE ${ACTIVE_MOVIES_WHERE}
        AND ai_tools IS NOT NULL
        AND ai_tools != ''
    `);

    const aiToolsMap = {};

    for (const row of aiToolsRaw) {
      const tools = String(row.ai_tools || "")
        .split(",")
        .map((tool) => tool.trim())
        .filter(Boolean);

      for (const tool of tools) {
        aiToolsMap[tool] = (aiToolsMap[tool] || 0) + 1;
      }
    }

    const aiTools = Object.entries(aiToolsMap)
      .map(([tool, count]) => ({ tool, count }))
      .sort((left, right) => right.count - left.count);

    return res.json({
      ok: true,
      stats: {
        totalFilms: Number(globalRow?.total_films || 0),
        totalCountries: Number(globalRow?.total_countries || 0),
        totalMinutes: Number(globalRow?.total_minutes || 0),
        avgMinutes: Number(globalRow?.avg_minutes || 0),
        filmsWithSubtitles: Number(globalRow?.films_with_subtitles || 0),
        languages: languages.map((row) => ({
          language: row.language,
          count: Number(row.count || 0),
        })),
        subtitleLanguages: subtitleLanguages.map((row) => ({
          language: row.language,
          count: Number(row.count || 0),
        })),
        ageGroups: ageGroups.map((row) => ({
          ageRange: row.age_range,
          count: Number(row.count || 0),
        })),
        countries: countries.map((row) => ({
          alpha2: row.alpha2,
          name: row.name_fr,
          count: Number(row.film_count || 0),
        })),
        aiTools,
      },
    });
  } catch (error) {
    console.error("[STATS] error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les statistiques.",
      details: error.message,
    });
  }
}
