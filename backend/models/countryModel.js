import { getDbPool } from "../db.js";

const pool = getDbPool();

export async function listCountriesForUpload() {
  const [rows] = await pool.query(
    `
      SELECT
        id,
        alpha2,
        name_fr,
        name_eng,
        name_ar,
        flag_path
      FROM countries
      ORDER BY name_fr ASC, name_eng ASC, alpha2 ASC
    `,
  );

  return Array.isArray(rows) ? rows : [];
}

