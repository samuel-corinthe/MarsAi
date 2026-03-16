import { getDbPool } from "../db.js";

const pool = getDbPool();

export async function findCountryIdByAlpha2(alpha2) {
  const [countryRows] = await pool.query(
    "SELECT id FROM countries WHERE alpha2 = ? LIMIT 1",
    [alpha2],
  );

  if (!Array.isArray(countryRows) || countryRows.length === 0) {
    return null;
  }

  return Number(countryRows[0].id);
}

export async function createMovieRecord({
  title,
  age,
  bio,
  socialLinks,
  synopsis,
  duration,
  releaseYear,
  countryId,
  language,
  subtitleLanguage,
  aiTools,
  posterUrl,
  videoUrl,
  youtubeUrl,
  viewCount,
  submittedBy,
  submitterEmail,
  submissionStatus,
}) {
  const [insertResult] = await pool.query(
    `INSERT INTO movies
      (title, age, bio, social_links, synopsis, duration, release_year, country_id, language, subtitle_language, ai_tools, poster_url, video_url, youtube_url, view_count, submitted_by, submitter_email, submission_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      title,
      age,
      bio,
      socialLinks,
      synopsis,
      duration,
      releaseYear,
      countryId,
      language,
      subtitleLanguage,
      aiTools,
      posterUrl,
      videoUrl,
      youtubeUrl,
      viewCount,
      submittedBy,
      submitterEmail,
      submissionStatus,
    ],
  );

  return Number(insertResult?.insertId || 0);
}

export async function createMovieCastEntries(movieId, castEntries) {
  for (const [index, member] of castEntries.entries()) {
    await pool.query(
      `INSERT INTO movie_cast (movie_id, person_name, role_name, avatar_url, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [
        movieId,
        member.name,
        member.role || null,
        member.avatarUrl || null,
        index + 1,
      ],
    );
  }
}
