let schemaReadyPromise = null;

export async function ensureAssignmentSchema(pool, policy) {
  if (!schemaReadyPromise) {
    schemaReadyPromise = (async () => {
      const manualRatioDefault = policy.defaultManualRatio.toFixed(2);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS admin_capacity_profiles (
          user_id INT(11) NOT NULL,
          capacity_minutes INT(11) NOT NULL DEFAULT ${policy.defaultCapacityMinutes},
          manual_ratio DECIMAL(5,2) NOT NULL DEFAULT ${manualRatioDefault},
          is_active TINYINT(1) NOT NULL DEFAULT 1,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (user_id),
          CONSTRAINT fk_admin_capacity_profiles_user
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.query(`
        CREATE TABLE IF NOT EXISTS movie_review_assignments (
          id INT(11) NOT NULL AUTO_INCREMENT,
          movie_id INT(11) NOT NULL,
          admin_id INT(11) NOT NULL,
          source ENUM('auto','manual','rebalance','swap') NOT NULL DEFAULT 'auto',
          status ENUM('assigned','in_progress','completed') NOT NULL DEFAULT 'assigned',
          locked TINYINT(1) NOT NULL DEFAULT 0,
          assigned_by INT(11) DEFAULT NULL,
          assigned_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
          started_at DATETIME DEFAULT NULL,
          completed_at DATETIME DEFAULT NULL,
          updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id),
          UNIQUE KEY uq_movie_admin_assignment (movie_id, admin_id),
          KEY idx_assignment_admin_status (admin_id, status),
          KEY idx_assignment_movie_status (movie_id, status),
          CONSTRAINT fk_movie_review_assignments_movie
            FOREIGN KEY (movie_id) REFERENCES movies(id) ON DELETE CASCADE,
          CONSTRAINT fk_movie_review_assignments_admin
            FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE,
          CONSTRAINT fk_movie_review_assignments_assigned_by
            FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
      `);

      await pool.query(
        `
          INSERT IGNORE INTO admin_capacity_profiles (user_id, capacity_minutes, manual_ratio, is_active)
          SELECT u.id, ?, ?, 1
          FROM users u
          WHERE u.role IN ('admin','superadmin')
        `,
        [policy.defaultCapacityMinutes, policy.defaultManualRatio],
      );
    })().catch((error) => {
      schemaReadyPromise = null;
      throw error;
    });
  }

  await schemaReadyPromise;
}

export async function fetchAdminsWithCapacity(pool, policy) {
  const [rows] = await pool.query(
    `
      SELECT
        u.id,
        u.email,
        u.role,
        COALESCE(ac.capacity_minutes, ?) AS capacity_minutes,
        COALESCE(ac.manual_ratio, ?) AS manual_ratio,
        COALESCE(ac.is_active, 1) AS is_active
      FROM users u
      LEFT JOIN admin_capacity_profiles ac ON ac.user_id = u.id
      WHERE u.role IN ('admin', 'superadmin')
      ORDER BY u.id ASC
    `,
    [policy.defaultCapacityMinutes, policy.defaultManualRatio],
  );

  return rows;
}

export async function fetchMoviesBasic(pool) {
  const [rows] = await pool.query(
    `
      SELECT id, title, COALESCE(duration, 0) AS duration
      FROM movies
      ORDER BY id ASC
    `,
  );

  return rows;
}

export async function fetchAssignmentsBasic(pool) {
  const [rows] = await pool.query(
    `
      SELECT id, movie_id, admin_id, source, status
      FROM movie_review_assignments
    `,
  );

  return rows;
}

export async function insertAssignmentsBatch(pool, inserts) {
  if (!inserts.length) return 0;

  const connection = await pool.getConnection();
  let createdAssignments = 0;

  try {
    await connection.beginTransaction();

    for (const item of inserts) {
      try {
        await connection.query(
          `
            INSERT INTO movie_review_assignments (
              movie_id,
              admin_id,
              source,
              status,
              locked,
              assigned_by
            )
            VALUES (?, ?, ?, 'assigned', 0, ?)
          `,
          [item.movieId, item.adminId, item.source, item.actorAdminId],
        );
        createdAssignments += 1;
      } catch (error) {
        if (error?.code !== "ER_DUP_ENTRY") throw error;
      }
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return createdAssignments;
}

export async function moveAssignmentsBatch(pool, moves, actorAdminId) {
  if (!moves.length) return 0;

  const connection = await pool.getConnection();
  let movedAssignments = 0;

  try {
    await connection.beginTransaction();

    for (const move of moves) {
      const [result] = await connection.query(
        `
          UPDATE movie_review_assignments
          SET admin_id = ?,
              source = 'rebalance',
              assigned_by = ?,
              updated_at = NOW()
          WHERE id = ?
            AND status = 'assigned'
            AND source <> 'manual'
        `,
        [move.toAdminId, actorAdminId, move.assignmentId],
      );
      movedAssignments += Number(result?.affectedRows || 0);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return movedAssignments;
}

export async function findMovieForUpdate(connection, movieId) {
  const [rows] = await connection.query(
    "SELECT id, COALESCE(duration, 0) AS duration FROM movies WHERE id = ? LIMIT 1 FOR UPDATE",
    [movieId],
  );
  return rows[0] || null;
}

export async function findExistingAssignmentForUpdate(connection, movieId, adminId) {
  const [rows] = await connection.query(
    "SELECT id FROM movie_review_assignments WHERE movie_id = ? AND admin_id = ? LIMIT 1 FOR UPDATE",
    [movieId, adminId],
  );
  return rows[0] || null;
}

export async function countMovieReviewersForUpdate(connection, movieId, countedStatusesSql) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM movie_review_assignments
      WHERE movie_id = ? AND status IN (${countedStatusesSql})
      FOR UPDATE
    `,
    [movieId],
  );

  return Number(rows?.[0]?.total || 0);
}

export async function ensureCapacityProfileForAdmin(connection, adminId, policy) {
  await connection.query(
    `
      INSERT IGNORE INTO admin_capacity_profiles (user_id, capacity_minutes, manual_ratio, is_active)
      SELECT id, ?, ?, 1
      FROM users
      WHERE id = ? AND role IN ('admin','superadmin')
    `,
    [policy.defaultCapacityMinutes, policy.defaultManualRatio, adminId],
  );
}

export async function fetchCapacityProfileForUpdate(connection, adminId) {
  const [rows] = await connection.query(
    "SELECT capacity_minutes, manual_ratio, is_active FROM admin_capacity_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE",
    [adminId],
  );

  return rows[0] || null;
}

export async function fetchManualPendingMinutesForUpdate(connection, adminId, pendingStatusesSql) {
  const [rows] = await connection.query(
    `
      SELECT COALESCE(SUM(COALESCE(m.duration, 0)), 0) AS total
      FROM movie_review_assignments a
      JOIN movies m ON m.id = a.movie_id
      WHERE a.admin_id = ?
        AND a.source = 'manual'
        AND a.status IN (${pendingStatusesSql})
      FOR UPDATE
    `,
    [adminId],
  );

  return Number(rows?.[0]?.total || 0);
}

export async function insertManualAssignment(connection, movieId, adminId) {
  await connection.query(
    `
      INSERT INTO movie_review_assignments (
        movie_id,
        admin_id,
        source,
        status,
        locked,
        assigned_by
      )
      VALUES (?, ?, 'manual', 'assigned', 0, ?)
    `,
    [movieId, adminId, adminId],
  );
}

export async function findAssignmentForReleaseForUpdate(connection, movieId, adminId) {
  const [rows] = await connection.query(
    `
      SELECT id, status
      FROM movie_review_assignments
      WHERE movie_id = ? AND admin_id = ?
      LIMIT 1
      FOR UPDATE
    `,
    [movieId, adminId],
  );

  return rows[0] || null;
}

export async function countRemainingReviewersForRelease(connection, movieId, assignmentId, countedStatusesSql) {
  const [rows] = await connection.query(
    `
      SELECT COUNT(*) AS total
      FROM movie_review_assignments
      WHERE movie_id = ?
        AND id <> ?
        AND status IN (${countedStatusesSql})
      FOR UPDATE
    `,
    [movieId, assignmentId],
  );

  return Number(rows?.[0]?.total || 0);
}

export async function deleteAssignmentById(connection, assignmentId) {
  await connection.query("DELETE FROM movie_review_assignments WHERE id = ?", [assignmentId]);
}

export async function updateAssignmentStatus(pool, setSql, params) {
  const [result] = await pool.query(
    `
      UPDATE movie_review_assignments
      SET ${setSql}
      WHERE movie_id = ? AND admin_id = ?
    `,
    params,
  );

  return Number(result?.affectedRows || 0);
}

export async function findAdminUserById(pool, adminId) {
  const [rows] = await pool.query(
    "SELECT id FROM users WHERE id = ? AND role IN ('admin', 'superadmin') LIMIT 1",
    [adminId],
  );

  return rows[0] || null;
}

export async function upsertAdminCapacityProfile(pool, { adminId, capacityMinutes, manualRatio, isActive }) {
  await pool.query(
    `
      INSERT INTO admin_capacity_profiles (user_id, capacity_minutes, manual_ratio, is_active)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        capacity_minutes = VALUES(capacity_minutes),
        manual_ratio = VALUES(manual_ratio),
        is_active = VALUES(is_active),
        updated_at = CURRENT_TIMESTAMP
    `,
    [adminId, capacityMinutes, manualRatio, isActive],
  );
}

export async function fetchMyAssignmentsRows(pool, adminId) {
  const [rows] = await pool.query(
    `
      SELECT movie_id, status, source
      FROM movie_review_assignments
      WHERE admin_id = ?
    `,
    [adminId],
  );

  return rows;
}

export async function fetchReviewerCountRows(pool, countedStatusesSql) {
  const [rows] = await pool.query(
    `
      SELECT movie_id, COUNT(*) AS reviewers_count
      FROM movie_review_assignments
      WHERE status IN (${countedStatusesSql})
      GROUP BY movie_id
    `,
  );

  return rows;
}

export async function fetchMyPendingMinutes(pool, adminId, pendingStatusesSql) {
  const [rows] = await pool.query(
    `
      SELECT COALESCE(SUM(COALESCE(m.duration, 0)), 0) AS total
      FROM movie_review_assignments a
      JOIN movies m ON m.id = a.movie_id
      WHERE a.admin_id = ?
        AND a.status IN (${pendingStatusesSql})
    `,
    [adminId],
  );

  return Number(rows?.[0]?.total || 0);
}

export async function fetchWorkloadRows(pool, { all, currentAdminId, policy, pendingStatusesSql }) {
  const query = `
    SELECT
      u.id,
      u.email,
      u.role,
      COALESCE(ac.capacity_minutes, ?) AS capacity_minutes,
      COALESCE(ac.manual_ratio, ?) AS manual_ratio,
      COALESCE(ac.is_active, 1) AS is_active,
      COALESCE(SUM(CASE WHEN a.status IN (${pendingStatusesSql}) THEN COALESCE(m.duration, 0) ELSE 0 END), 0) AS pending_minutes,
      COALESCE(SUM(CASE WHEN a.status = 'completed' THEN COALESCE(m.duration, 0) ELSE 0 END), 0) AS completed_minutes,
      COALESCE(SUM(CASE WHEN a.status = 'assigned' THEN 1 ELSE 0 END), 0) AS assigned_count,
      COALESCE(SUM(CASE WHEN a.status = 'in_progress' THEN 1 ELSE 0 END), 0) AS in_progress_count,
      COALESCE(SUM(CASE WHEN a.status = 'completed' THEN 1 ELSE 0 END), 0) AS completed_count
    FROM users u
    LEFT JOIN admin_capacity_profiles ac ON ac.user_id = u.id
    LEFT JOIN movie_review_assignments a ON a.admin_id = u.id
    LEFT JOIN movies m ON m.id = a.movie_id
    WHERE u.role IN ('admin', 'superadmin') ${all ? "" : "AND u.id = ?"}
    GROUP BY u.id, u.email, u.role, ac.capacity_minutes, ac.manual_ratio, ac.is_active
    ORDER BY u.id ASC
  `;

  const params = all
    ? [policy.defaultCapacityMinutes, policy.defaultManualRatio]
    : [policy.defaultCapacityMinutes, policy.defaultManualRatio, currentAdminId];

  const [rows] = await pool.query(query, params);
  return rows;
}
