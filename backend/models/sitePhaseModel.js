const SITE_PHASE_TABLE = "site_phase_state";
const PHASE2_SELECTION_TABLE = "phase2_movie_selections";
const PHASE3_SELECTION_TABLE = "phase3_winner_selections";
const LEGACY_PHASE2_SELECTION_TABLE = "admin_selections";
const LEGACY_PHASE3_SELECTION_TABLE = "admin_selections";

export const SITE_PHASE_VALUES = ["phase_1", "phase_2", "phase_3"];
export const SITE_PHASE_MODE_VALUES = ["manual", "timer"];

async function getExistingColumns(pool) {
  const [rows] = await pool.query(`SHOW COLUMNS FROM \`${SITE_PHASE_TABLE}\``);
  return new Set(rows.map((row) => String(row.Field || "").trim()));
}

async function addColumnIfMissing(pool, columns, columnName, definitionSql) {
  if (columns.has(columnName)) return;
  await pool.query(
    `ALTER TABLE \`${SITE_PHASE_TABLE}\` ADD COLUMN \`${columnName}\` ${definitionSql}`,
  );
  columns.add(columnName);
}

async function ensurePrimaryKeyOnId(pool) {
  const [rows] = await pool.query(`SHOW INDEX FROM \`${SITE_PHASE_TABLE}\` WHERE Key_name = 'PRIMARY'`);
  if (rows.length > 0) return;
  const hasPkOnId = rows.some((row) => String(row.Column_name || "") === "id");
  if (hasPkOnId) return;
  await pool.query(`ALTER TABLE \`${SITE_PHASE_TABLE}\` ADD PRIMARY KEY (\`id\`)`);
}

async function ensurePhase2SelectionSchema(pool) {
  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS \`${PHASE2_SELECTION_TABLE}\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`movie_id\` int(11) NOT NULL,
        \`selection_criteria\` varchar(100) NOT NULL DEFAULT 'Phase 2',
        \`selected_by\` int(11) DEFAULT NULL,
        \`selected_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_phase2_movie\` (\`movie_id\`),
        KEY \`idx_phase2_selected_by\` (\`selected_by\`),
        CONSTRAINT \`fk_phase2_selected_movie\` FOREIGN KEY (\`movie_id\`) REFERENCES \`movies\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_phase2_selected_by\` FOREIGN KEY (\`selected_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
  );

  const [legacyTableRows] = await pool.query(
    `SHOW TABLES LIKE ?`,
    [LEGACY_PHASE2_SELECTION_TABLE],
  );
  if (legacyTableRows.length === 0) return;

  await pool.query(
    `
      INSERT INTO \`${PHASE2_SELECTION_TABLE}\` (
        movie_id,
        selection_criteria,
        selected_by,
        selected_at
      )
      SELECT
        legacy.movie_id,
        CASE
          WHEN legacy.selection_criteria IS NULL OR TRIM(legacy.selection_criteria) = '' THEN 'Phase 2'
          ELSE legacy.selection_criteria
        END,
        NULL,
        legacy.added_at
      FROM \`${LEGACY_PHASE2_SELECTION_TABLE}\` legacy
      LEFT JOIN \`${PHASE2_SELECTION_TABLE}\` phase2 ON phase2.movie_id = legacy.movie_id
      WHERE phase2.movie_id IS NULL
        AND LOWER(TRIM(COALESCE(legacy.selection_criteria, ''))) = 'phase 2'
    `,
  );
}

async function ensurePhase3SelectionSchema(pool) {
  await pool.query(
    `
      CREATE TABLE IF NOT EXISTS \`${PHASE3_SELECTION_TABLE}\` (
        \`id\` int(11) NOT NULL AUTO_INCREMENT,
        \`movie_id\` int(11) NOT NULL,
        \`selection_criteria\` varchar(100) NOT NULL DEFAULT 'Phase 3',
        \`selected_by\` int(11) DEFAULT NULL,
        \`selected_at\` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`uq_phase3_movie\` (\`movie_id\`),
        KEY \`idx_phase3_selected_by\` (\`selected_by\`),
        CONSTRAINT \`fk_phase3_selected_movie\` FOREIGN KEY (\`movie_id\`) REFERENCES \`movies\` (\`id\`) ON DELETE CASCADE,
        CONSTRAINT \`fk_phase3_selected_by\` FOREIGN KEY (\`selected_by\`) REFERENCES \`users\` (\`id\`) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `,
  );

  const [legacyTableRows] = await pool.query(
    `SHOW TABLES LIKE ?`,
    [LEGACY_PHASE3_SELECTION_TABLE],
  );
  if (legacyTableRows.length === 0) return;

  await pool.query(
    `
      INSERT INTO \`${PHASE3_SELECTION_TABLE}\` (
        movie_id,
        selection_criteria,
        selected_by,
        selected_at
      )
      SELECT
        legacy.movie_id,
        CASE
          WHEN legacy.selection_criteria IS NULL OR TRIM(legacy.selection_criteria) = '' THEN 'Phase 3'
          ELSE legacy.selection_criteria
        END,
        NULL,
        legacy.added_at
      FROM \`${LEGACY_PHASE3_SELECTION_TABLE}\` legacy
      LEFT JOIN \`${PHASE3_SELECTION_TABLE}\` phase3 ON phase3.movie_id = legacy.movie_id
      WHERE phase3.movie_id IS NULL
        AND LOWER(TRIM(COALESCE(legacy.selection_criteria, ''))) = 'phase 3'
    `,
  );
}

export async function ensureSitePhaseSchema(pool) {
  await ensurePhase2SelectionSchema(pool);
  await ensurePhase3SelectionSchema(pool);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS \`${SITE_PHASE_TABLE}\` (
      \`id\` tinyint(1) NOT NULL,
      \`current_phase\` enum('phase_1','phase_2','phase_3') NOT NULL DEFAULT 'phase_1',
      \`mode\` enum('manual','timer') NOT NULL DEFAULT 'manual',
      \`phase_1_ends_at\` datetime DEFAULT NULL,
      \`phase_2_ends_at\` datetime DEFAULT NULL,
      \`phase_3_ends_at\` datetime DEFAULT NULL,
      \`updated_by\` int(11) DEFAULT NULL,
      \`updated_at\` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (\`id\`)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  const columns = await getExistingColumns(pool);
  await addColumnIfMissing(pool, columns, "id", "tinyint(1) NOT NULL");
  await addColumnIfMissing(
    pool,
    columns,
    "current_phase",
    "enum('phase_1','phase_2','phase_3') NOT NULL DEFAULT 'phase_1'",
  );
  await addColumnIfMissing(
    pool,
    columns,
    "mode",
    "enum('manual','timer') NOT NULL DEFAULT 'manual'",
  );
  await addColumnIfMissing(pool, columns, "phase_1_ends_at", "datetime DEFAULT NULL");
  await addColumnIfMissing(pool, columns, "phase_2_ends_at", "datetime DEFAULT NULL");
  await addColumnIfMissing(pool, columns, "phase_3_ends_at", "datetime DEFAULT NULL");
  await addColumnIfMissing(pool, columns, "updated_by", "int(11) DEFAULT NULL");
  await addColumnIfMissing(pool, columns, "updated_at", "timestamp NULL DEFAULT NULL");
  await addColumnIfMissing(pool, columns, "phase_2_ready", "tinyint(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing(pool, columns, "phase_2_ready_by", "int(11) DEFAULT NULL");
  await addColumnIfMissing(pool, columns, "phase_2_ready_at", "datetime DEFAULT NULL");
  await addColumnIfMissing(pool, columns, "phase_3_ready", "tinyint(1) NOT NULL DEFAULT 0");
  await addColumnIfMissing(pool, columns, "phase_3_ready_by", "int(11) DEFAULT NULL");
  await addColumnIfMissing(pool, columns, "phase_3_ready_at", "datetime DEFAULT NULL");
  await ensurePrimaryKeyOnId(pool);

  await pool.query(
    `
      INSERT IGNORE INTO \`${SITE_PHASE_TABLE}\` (
        id,
        current_phase,
        mode,
        phase_2_ready,
        phase_3_ready,
        updated_at
      )
      VALUES (1, 'phase_1', 'manual', 0, 0, CURRENT_TIMESTAMP)
    `,
  );
}

export async function fetchCurrentSitePhase(pool) {
  const [rows] = await pool.query(
    `
      SELECT
        s.id,
        s.current_phase,
        s.mode,
        s.phase_1_ends_at,
        s.phase_2_ends_at,
        s.phase_3_ends_at,
        s.phase_2_ready,
        s.phase_2_ready_by,
        s.phase_2_ready_at,
        s.phase_3_ready,
        s.phase_3_ready_by,
        s.phase_3_ready_at,
        s.updated_by,
        s.updated_at,
        u.first_name AS updated_by_first_name,
        u.last_name AS updated_by_last_name,
        ready2_u.first_name AS phase2_ready_by_first_name,
        ready2_u.last_name AS phase2_ready_by_last_name,
        ready3_u.first_name AS phase3_ready_by_first_name,
        ready3_u.last_name AS phase3_ready_by_last_name
      FROM \`${SITE_PHASE_TABLE}\` s
      LEFT JOIN users u ON u.id = s.updated_by
      LEFT JOIN users ready2_u ON ready2_u.id = s.phase_2_ready_by
      LEFT JOIN users ready3_u ON ready3_u.id = s.phase_3_ready_by
      WHERE s.id = 1
      LIMIT 1
    `,
  );

  return rows?.[0] || null;
}

export async function updateCurrentSitePhase(pool, { currentPhase, mode, updatedBy }) {
  await pool.query(
    `
      UPDATE \`${SITE_PHASE_TABLE}\`
      SET
        current_phase = ?,
        mode = ?,
        updated_by = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `,
    [currentPhase, mode, updatedBy || null],
  );
}

export async function countPhase2SelectedMovies(pool) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${PHASE2_SELECTION_TABLE}\``);
  return Number(rows?.[0]?.total || 0);
}

export async function fetchPhase2SelectedMovies(pool) {
  const [rows] = await pool.query(
    `
      SELECT
        m.id,
        m.title,
        m.poster_url,
        m.submitted_by,
        m.youtube_url,
        m.video_url,
        m.submission_status,
        c.alpha2 AS country_alpha2,
        c.name_fr AS country_name_fr,
        c.flag_path AS country_flag_path,
        s.selection_criteria,
        s.selected_at AS added_at
      FROM \`${PHASE2_SELECTION_TABLE}\` s
      INNER JOIN movies m ON m.id = s.movie_id
      LEFT JOIN countries c ON c.id = m.country_id
      ORDER BY s.id ASC
    `,
  );
  return rows;
}

export async function isMovieSelectedForPhase2(pool, movieId) {
  const [rows] = await pool.query(
    `SELECT id FROM \`${PHASE2_SELECTION_TABLE}\` WHERE movie_id = ? LIMIT 1`,
    [movieId],
  );
  return rows.length > 0;
}

export async function insertPhase2MovieSelection(pool, { movieId, selectionCriteria, selectedBy }) {
  const [result] = await pool.query(
    `
      INSERT INTO \`${PHASE2_SELECTION_TABLE}\` (movie_id, selection_criteria, selected_by, selected_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [movieId, selectionCriteria, selectedBy || null],
  );
  return Number(result?.insertId || 0);
}

export async function deletePhase2MovieSelection(pool, movieId) {
  const [result] = await pool.query(
    `DELETE FROM \`${PHASE2_SELECTION_TABLE}\` WHERE movie_id = ?`,
    [movieId],
  );
  return Number(result?.affectedRows || 0);
}

export async function setPhase2ReadyFlag(pool, { isReady, readyBy }) {
  const safeReady = isReady ? 1 : 0;
  const safeReadyBy = safeReady ? readyBy || null : null;
  const readyAtSql = safeReady ? "NOW()" : "NULL";

  await pool.query(
    `
      UPDATE \`${SITE_PHASE_TABLE}\`
      SET
        phase_2_ready = ?,
        phase_2_ready_by = ?,
        phase_2_ready_at = ${readyAtSql},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `,
    [safeReady, safeReadyBy],
  );
}

export async function countPhase3SelectedMovies(pool) {
  const [rows] = await pool.query(`SELECT COUNT(*) AS total FROM \`${PHASE3_SELECTION_TABLE}\``);
  return Number(rows?.[0]?.total || 0);
}

export async function fetchPhase3SelectedMovies(pool) {
  const [rows] = await pool.query(
    `
      SELECT
        m.id,
        m.title,
        m.poster_url,
        m.submitted_by,
        m.youtube_url,
        m.video_url,
        m.submission_status,
        c.alpha2 AS country_alpha2,
        c.name_fr AS country_name_fr,
        c.flag_path AS country_flag_path,
        s.selection_criteria,
        s.selected_at AS added_at
      FROM \`${PHASE3_SELECTION_TABLE}\` s
      INNER JOIN movies m ON m.id = s.movie_id
      LEFT JOIN countries c ON c.id = m.country_id
      ORDER BY s.id ASC
    `,
  );
  return rows;
}

export async function isMovieSelectedForPhase3(pool, movieId) {
  const [rows] = await pool.query(
    `SELECT id FROM \`${PHASE3_SELECTION_TABLE}\` WHERE movie_id = ? LIMIT 1`,
    [movieId],
  );
  return rows.length > 0;
}

export async function insertPhase3MovieSelection(pool, { movieId, selectionCriteria, selectedBy }) {
  const [result] = await pool.query(
    `
      INSERT INTO \`${PHASE3_SELECTION_TABLE}\` (movie_id, selection_criteria, selected_by, selected_at)
      VALUES (?, ?, ?, CURRENT_TIMESTAMP)
    `,
    [movieId, selectionCriteria, selectedBy || null],
  );
  return Number(result?.insertId || 0);
}

export async function deletePhase3MovieSelection(pool, movieId) {
  const [result] = await pool.query(
    `DELETE FROM \`${PHASE3_SELECTION_TABLE}\` WHERE movie_id = ?`,
    [movieId],
  );
  return Number(result?.affectedRows || 0);
}

export async function setPhase3ReadyFlag(pool, { isReady, readyBy }) {
  const safeReady = isReady ? 1 : 0;
  const safeReadyBy = safeReady ? readyBy || null : null;
  const readyAtSql = safeReady ? "NOW()" : "NULL";

  await pool.query(
    `
      UPDATE \`${SITE_PHASE_TABLE}\`
      SET
        phase_3_ready = ?,
        phase_3_ready_by = ?,
        phase_3_ready_at = ${readyAtSql},
        updated_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `,
    [safeReady, safeReadyBy],
  );
}
