import express from "express";
import { getDbPool } from "../db.js";

const router = express.Router();

const COUNTED_STATUSES = ["assigned", "in_progress", "completed"];
const PENDING_STATUSES = ["assigned", "in_progress"];
const ALLOWED_STATUSES = new Set(COUNTED_STATUSES);
const ALLOWED_SOURCES = new Set(["auto", "manual", "rebalance", "swap"]);

function toInt(value, fallback, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function toRatio(value, fallback) {
  const parsed = Number.parseFloat(value);
  if (!Number.isFinite(parsed)) return fallback;
  const bounded = Math.max(0, Math.min(parsed, 0.9));
  return Math.round(bounded * 100) / 100;
}

function getPolicy() {
  const minReviewers = toInt(process.env.ASSIGNMENT_MIN_REVIEWERS, 3, 1, 10);
  const maxReviewers = toInt(process.env.ASSIGNMENT_MAX_REVIEWERS, 5, minReviewers, 15);
  const defaultCapacityMinutes = toInt(process.env.ASSIGNMENT_DEFAULT_CAPACITY_MINUTES, 720, 60, 20000);
  const defaultManualRatio = toRatio(process.env.ASSIGNMENT_DEFAULT_MANUAL_RATIO, 0.3);
  const rebalanceThreshold = toRatio(process.env.ASSIGNMENT_REBALANCE_THRESHOLD, 0.1);

  return {
    minReviewers,
    maxReviewers,
    defaultCapacityMinutes,
    defaultManualRatio,
    rebalanceThreshold,
  };
}

const COUNTED_STATUSES_SQL = "'assigned','in_progress','completed'";
const PENDING_STATUSES_SQL = "'assigned','in_progress'";

let schemaReadyPromise = null;

async function ensureSchema(pool) {
  const policy = getPolicy();

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

async function fetchAdmins(pool, policy) {
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

  return rows.map((row) => ({
    id: Number(row.id),
    email: row.email,
    role: row.role,
    capacityMinutes: Math.max(60, Number(row.capacity_minutes || policy.defaultCapacityMinutes)),
    manualRatio: Math.max(0, Math.min(Number(row.manual_ratio ?? policy.defaultManualRatio), 0.9)),
    isActive: Number(row.is_active || 0) === 1,
  }));
}

async function fetchMovies(pool) {
  const [rows] = await pool.query(
    `
      SELECT id, title, COALESCE(duration, 0) AS duration
      FROM movies
      ORDER BY id ASC
    `,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    duration: Math.max(1, Number(row.duration || 1)),
  }));
}

async function fetchAssignments(pool) {
  const [rows] = await pool.query(
    `
      SELECT id, movie_id, admin_id, source, status
      FROM movie_review_assignments
    `,
  );

  return rows.map((row) => ({
    id: Number(row.id),
    movieId: Number(row.movie_id),
    adminId: Number(row.admin_id),
    source: String(row.source || "auto"),
    status: String(row.status || "assigned"),
  }));
}
function buildState({ admins, movies, assignments }) {
  const movieDuration = new Map(movies.map((movie) => [movie.id, movie.duration]));
  const movieAssignedAdmins = new Map();
  const movieReviewerCounts = new Map();
  const adminPendingMinutes = new Map();
  const adminById = new Map(admins.map((admin) => [admin.id, admin]));

  for (const assignment of assignments) {
    const duration = movieDuration.get(assignment.movieId) || 1;

    if (!movieAssignedAdmins.has(assignment.movieId)) {
      movieAssignedAdmins.set(assignment.movieId, new Set());
    }
    movieAssignedAdmins.get(assignment.movieId).add(assignment.adminId);

    if (COUNTED_STATUSES.includes(assignment.status)) {
      movieReviewerCounts.set(
        assignment.movieId,
        (movieReviewerCounts.get(assignment.movieId) || 0) + 1,
      );
    }

    if (PENDING_STATUSES.includes(assignment.status)) {
      adminPendingMinutes.set(
        assignment.adminId,
        (adminPendingMinutes.get(assignment.adminId) || 0) + duration,
      );
    }
  }

  for (const admin of admins) {
    if (!adminPendingMinutes.has(admin.id)) adminPendingMinutes.set(admin.id, 0);
  }

  return {
    movieDuration,
    movieAssignedAdmins,
    movieReviewerCounts,
    adminPendingMinutes,
    adminById,
  };
}

function adminRatio(admin, pendingMinutes) {
  return pendingMinutes / Math.max(1, Number(admin.capacityMinutes || 1));
}

function weightedPick(candidates, getWeight) {
  if (!candidates.length) return null;

  let total = 0;
  const weights = candidates.map((candidate) => {
    const weight = Math.max(0.001, Number(getWeight(candidate)) || 0.001);
    total += weight;
    return weight;
  });

  let cursor = Math.random() * total;
  for (let index = 0; index < candidates.length; index += 1) {
    cursor -= weights[index];
    if (cursor <= 0) return candidates[index];
  }

  return candidates[candidates.length - 1];
}

async function autoAssignMissingReviews({ pool, actorAdminId, source = "auto" }) {
  if (!ALLOWED_SOURCES.has(source)) {
    throw new Error(`invalid_assignment_source:${source}`);
  }

  const policy = getPolicy();
  await ensureSchema(pool);

  const [admins, movies, assignments] = await Promise.all([
    fetchAdmins(pool, policy),
    fetchMovies(pool),
    fetchAssignments(pool),
  ]);

  const activeAdmins = admins.filter((admin) => admin.isActive);
  if (!activeAdmins.length || !movies.length) {
    return { createdAssignments: 0, uncoveredMovies: movies.length };
  }

  const state = buildState({ admins, movies, assignments });
  const inserts = [];

  for (const movie of movies) {
    const assignedSet = state.movieAssignedAdmins.get(movie.id) || new Set();
    let reviewerCount = state.movieReviewerCounts.get(movie.id) || 0;

    while (reviewerCount < policy.minReviewers) {
      const candidates = activeAdmins.filter((admin) => !assignedSet.has(admin.id));
      if (!candidates.length) break;

      const chosen = weightedPick(candidates, (candidate) => {
        const currentPending = state.adminPendingMinutes.get(candidate.id) || 0;
        const autoBudget = Math.max(
          60,
          Math.round(candidate.capacityMinutes * (1 - candidate.manualRatio)),
        );
        const projectedRatio = (currentPending + movie.duration) / autoBudget;
        const fairness = Math.max(0.05, 1.8 - projectedRatio);
        return fairness * (0.8 + Math.random() * 0.4);
      });

      inserts.push({
        movieId: movie.id,
        adminId: chosen.id,
        source,
        actorAdminId: Number.isFinite(actorAdminId) ? actorAdminId : null,
      });

      assignedSet.add(chosen.id);
      state.movieAssignedAdmins.set(movie.id, assignedSet);
      reviewerCount += 1;
      state.movieReviewerCounts.set(movie.id, reviewerCount);
      state.adminPendingMinutes.set(
        chosen.id,
        (state.adminPendingMinutes.get(chosen.id) || 0) + movie.duration,
      );
    }
  }

  let createdAssignments = 0;
  if (inserts.length) {
    const connection = await pool.getConnection();
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
  }

  const uncoveredMovies = movies.reduce(
    (total, movie) => total + ((state.movieReviewerCounts.get(movie.id) || 0) < policy.minReviewers ? 1 : 0),
    0,
  );

  return { createdAssignments, uncoveredMovies };
}
async function rebalanceUnstartedAssignments({ pool, actorAdminId }) {
  const policy = getPolicy();
  await ensureSchema(pool);

  const [admins, movies, assignments] = await Promise.all([
    fetchAdmins(pool, policy),
    fetchMovies(pool),
    fetchAssignments(pool),
  ]);

  const activeAdmins = admins.filter((admin) => admin.isActive);
  if (activeAdmins.length < 2) return { movedAssignments: 0 };

  const state = buildState({ admins, movies, assignments });

  const getAverageRatio = () => {
    const total = activeAdmins.reduce((sum, admin) => {
      const pending = state.adminPendingMinutes.get(admin.id) || 0;
      return sum + adminRatio(admin, pending);
    }, 0);
    return total / Math.max(1, activeAdmins.length);
  };

  const movable = assignments
    .filter((assignment) => assignment.status === "assigned" && assignment.source !== "manual")
    .sort((left, right) => {
      const leftAdmin = state.adminById.get(left.adminId);
      const rightAdmin = state.adminById.get(right.adminId);
      const leftRatio = leftAdmin ? adminRatio(leftAdmin, state.adminPendingMinutes.get(left.adminId) || 0) : 0;
      const rightRatio = rightAdmin ? adminRatio(rightAdmin, state.adminPendingMinutes.get(right.adminId) || 0) : 0;
      return rightRatio - leftRatio;
    });

  const moves = [];

  for (const assignment of movable) {
    const sourceAdmin = state.adminById.get(assignment.adminId);
    if (!sourceAdmin) continue;

    const movieDuration = state.movieDuration.get(assignment.movieId) || 1;
    const sourcePending = state.adminPendingMinutes.get(sourceAdmin.id) || 0;
    const sourceRatio = adminRatio(sourceAdmin, sourcePending);

    if (sourceRatio <= getAverageRatio() + policy.rebalanceThreshold) continue;

    const assignedSet = state.movieAssignedAdmins.get(assignment.movieId) || new Set();
    const candidates = activeAdmins.filter(
      (admin) => admin.id !== sourceAdmin.id && !assignedSet.has(admin.id),
    );

    let bestCandidate = null;
    let bestProjectedRatio = Number.POSITIVE_INFINITY;

    for (const candidate of candidates) {
      const candidatePending = state.adminPendingMinutes.get(candidate.id) || 0;
      const projectedRatio = adminRatio(candidate, candidatePending + movieDuration);
      if (projectedRatio < bestProjectedRatio) {
        bestProjectedRatio = projectedRatio;
        bestCandidate = candidate;
      }
    }

    if (!bestCandidate) continue;

    const projectedSourceRatio = adminRatio(sourceAdmin, sourcePending - movieDuration);
    if (bestProjectedRatio + 0.02 >= projectedSourceRatio) continue;

    moves.push({
      assignmentId: assignment.id,
      toAdminId: bestCandidate.id,
    });

    state.adminPendingMinutes.set(sourceAdmin.id, Math.max(0, sourcePending - movieDuration));
    state.adminPendingMinutes.set(
      bestCandidate.id,
      (state.adminPendingMinutes.get(bestCandidate.id) || 0) + movieDuration,
    );

    assignedSet.delete(sourceAdmin.id);
    assignedSet.add(bestCandidate.id);
    state.movieAssignedAdmins.set(assignment.movieId, assignedSet);
  }

  if (!moves.length) return { movedAssignments: 0 };

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
        [move.toAdminId, Number.isFinite(actorAdminId) ? actorAdminId : null, move.assignmentId],
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

  return { movedAssignments };
}

async function fetchWorkloads(pool, { all = false, currentAdminId = null } = {}) {
  const policy = getPolicy();
  const query = `
    SELECT
      u.id,
      u.email,
      u.role,
      COALESCE(ac.capacity_minutes, ?) AS capacity_minutes,
      COALESCE(ac.manual_ratio, ?) AS manual_ratio,
      COALESCE(ac.is_active, 1) AS is_active,
      COALESCE(SUM(CASE WHEN a.status IN (${PENDING_STATUSES_SQL}) THEN COALESCE(m.duration, 0) ELSE 0 END), 0) AS pending_minutes,
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

  return rows.map((row) => {
    const capacityMinutes = Math.max(60, Number(row.capacity_minutes || policy.defaultCapacityMinutes));
    const pendingMinutes = Number(row.pending_minutes || 0);
    return {
      adminId: Number(row.id),
      email: row.email,
      role: row.role,
      isActive: Number(row.is_active || 0) === 1,
      capacityMinutes,
      manualRatio: Number(row.manual_ratio || policy.defaultManualRatio),
      pendingMinutes,
      completedMinutes: Number(row.completed_minutes || 0),
      assignedCount: Number(row.assigned_count || 0),
      inProgressCount: Number(row.in_progress_count || 0),
      completedCount: Number(row.completed_count || 0),
      loadRatio: Number((pendingMinutes / Math.max(1, capacityMinutes)).toFixed(3)),
    };
  });
}
router.post("/auto-assign", async (req, res) => {
  if (req.auth?.role !== "superadmin") {
    return res.status(403).json({ error: "Seul un superadmin peut lancer la repartition automatique." });
  }

  const pool = getDbPool();

  try {
    const result = await autoAssignMissingReviews({
      pool,
      actorAdminId: Number(req.auth?.userId),
      source: "auto",
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    console.error("[ASSIGNMENTS] auto-assign error:", error.message);
    return res.status(500).json({
      error: "Impossible de lancer la repartition automatique.",
      details: error.message,
    });
  }
});

router.post("/rebalance", async (req, res) => {
  if (req.auth?.role !== "superadmin") {
    return res.status(403).json({ error: "Seul un superadmin peut reequilibrer les assignations." });
  }

  const pool = getDbPool();

  try {
    const autoResult = await autoAssignMissingReviews({
      pool,
      actorAdminId: Number(req.auth?.userId),
      source: "rebalance",
    });
    const rebalanceResult = await rebalanceUnstartedAssignments({
      pool,
      actorAdminId: Number(req.auth?.userId),
    });

    return res.json({
      ok: true,
      createdAssignments: autoResult.createdAssignments,
      movedAssignments: rebalanceResult.movedAssignments,
      uncoveredMovies: autoResult.uncoveredMovies,
    });
  } catch (error) {
    console.error("[ASSIGNMENTS] rebalance error:", error.message);
    return res.status(500).json({
      error: "Impossible de reequilibrer les assignations.",
      details: error.message,
    });
  }
});

router.post("/claim", async (req, res) => {
  const adminId = Number(req.auth?.userId);
  const movieId = Number(req.body?.movieId);

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  const pool = getDbPool();
  const policy = getPolicy();

  try {
    await ensureSchema(pool);
    const connection = await pool.getConnection();
    try {
      await connection.beginTransaction();

      const [movieRows] = await connection.query(
        "SELECT id, COALESCE(duration, 0) AS duration FROM movies WHERE id = ? LIMIT 1 FOR UPDATE",
        [movieId],
      );
      if (!movieRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Film introuvable." });
      }

      const movieDuration = Math.max(1, Number(movieRows[0].duration || 1));

      const [existingRows] = await connection.query(
        "SELECT id FROM movie_review_assignments WHERE movie_id = ? AND admin_id = ? LIMIT 1 FOR UPDATE",
        [movieId, adminId],
      );
      if (existingRows.length) {
        await connection.rollback();
        return res.status(409).json({ error: "Ce film est deja assigne a cet admin." });
      }

      const [reviewerRows] = await connection.query(
        `
          SELECT COUNT(*) AS total
          FROM movie_review_assignments
          WHERE movie_id = ? AND status IN (${COUNTED_STATUSES_SQL})
          FOR UPDATE
        `,
        [movieId],
      );
      const reviewerCount = Number(reviewerRows?.[0]?.total || 0);
      if (reviewerCount >= policy.maxReviewers) {
        await connection.rollback();
        return res.status(409).json({
          error: "Le film a deja atteint le nombre maximum de reviewers.",
        });
      }

      await connection.query(
        `
          INSERT IGNORE INTO admin_capacity_profiles (user_id, capacity_minutes, manual_ratio, is_active)
          SELECT id, ?, ?, 1
          FROM users
          WHERE id = ? AND role IN ('admin','superadmin')
        `,
        [policy.defaultCapacityMinutes, policy.defaultManualRatio, adminId],
      );

      const [capacityRows] = await connection.query(
        "SELECT capacity_minutes, manual_ratio, is_active FROM admin_capacity_profiles WHERE user_id = ? LIMIT 1 FOR UPDATE",
        [adminId],
      );

      const capacity = Math.max(
        60,
        Number(capacityRows?.[0]?.capacity_minutes || policy.defaultCapacityMinutes),
      );
      const manualRatio = Math.max(
        0,
        Math.min(Number(capacityRows?.[0]?.manual_ratio ?? policy.defaultManualRatio), 0.9),
      );
      const isActive = Number(capacityRows?.[0]?.is_active || 0) === 1;
      if (!isActive) {
        await connection.rollback();
        return res.status(409).json({ error: "Cet admin est marque inactif pour les assignations." });
      }

      const [manualLoadRows] = await connection.query(
        `
          SELECT COALESCE(SUM(COALESCE(m.duration, 0)), 0) AS total
          FROM movie_review_assignments a
          JOIN movies m ON m.id = a.movie_id
          WHERE a.admin_id = ?
            AND a.source = 'manual'
            AND a.status IN (${PENDING_STATUSES_SQL})
          FOR UPDATE
        `,
        [adminId],
      );
      const manualPendingMinutes = Number(manualLoadRows?.[0]?.total || 0);
      const manualBudgetMinutes = Math.max(0, Math.round(capacity * manualRatio));
      if (manualBudgetMinutes > 0 && manualPendingMinutes + movieDuration > manualBudgetMinutes) {
        await connection.rollback();
        return res.status(409).json({
          error: "Capacite manuelle depassee pour cet admin.",
        });
      }

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

      await connection.commit();

      return res.json({ ok: true, movieId, adminId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("[ASSIGNMENTS] claim error:", error.message);
    return res.status(500).json({
      error: "Impossible de prendre ce film.",
      details: error.message,
    });
  }
});
router.post("/release", async (req, res) => {
  const adminId = Number(req.auth?.userId);
  const movieId = Number(req.body?.movieId);

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  const pool = getDbPool();
  const policy = getPolicy();

  try {
    await ensureSchema(pool);
    const connection = await pool.getConnection();

    try {
      await connection.beginTransaction();

      const [assignmentRows] = await connection.query(
        `
          SELECT id, status
          FROM movie_review_assignments
          WHERE movie_id = ? AND admin_id = ?
          LIMIT 1
          FOR UPDATE
        `,
        [movieId, adminId],
      );

      if (!assignmentRows.length) {
        await connection.rollback();
        return res.status(404).json({ error: "Aucune assignation a retirer pour ce film." });
      }

      const assignment = assignmentRows[0];
      if (assignment.status !== "assigned") {
        await connection.rollback();
        return res.status(409).json({
          error: "Seules les assignations non commencees peuvent etre retirees.",
        });
      }

      const [remainingRows] = await connection.query(
        `
          SELECT COUNT(*) AS total
          FROM movie_review_assignments
          WHERE movie_id = ?
            AND id <> ?
            AND status IN (${COUNTED_STATUSES_SQL})
          FOR UPDATE
        `,
        [movieId, assignment.id],
      );

      const remainingCount = Number(remainingRows?.[0]?.total || 0);
      if (remainingCount < policy.minReviewers) {
        await connection.rollback();
        return res.status(409).json({
          error: "Impossible de retirer ce film: minimum de reviewers casse.",
        });
      }

      await connection.query("DELETE FROM movie_review_assignments WHERE id = ?", [assignment.id]);
      await connection.commit();

      return res.json({ ok: true, movieId, adminId });
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  } catch (error) {
    console.error("[ASSIGNMENTS] release error:", error.message);
    return res.status(500).json({
      error: "Impossible de retirer ce film.",
      details: error.message,
    });
  }
});

router.post("/status", async (req, res) => {
  const adminId = Number(req.auth?.userId);
  const movieId = Number(req.body?.movieId);
  const status = String(req.body?.status || "").trim();

  if (!Number.isFinite(adminId) || adminId <= 0) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!Number.isFinite(movieId) || movieId <= 0) {
    return res.status(400).json({ error: "movieId invalide." });
  }
  if (!ALLOWED_STATUSES.has(status)) {
    return res.status(400).json({ error: "status invalide." });
  }

  const pool = getDbPool();

  try {
    await ensureSchema(pool);

    const updates = [status];
    let setSql = "status = ?";

    if (status === "in_progress") {
      setSql += ", started_at = COALESCE(started_at, NOW()), completed_at = NULL";
    } else if (status === "completed") {
      setSql += ", started_at = COALESCE(started_at, NOW()), completed_at = NOW()";
    } else {
      setSql += ", started_at = NULL, completed_at = NULL";
    }

    updates.push(movieId, adminId);

    const [result] = await pool.query(
      `
        UPDATE movie_review_assignments
        SET ${setSql}
        WHERE movie_id = ? AND admin_id = ?
      `,
      updates,
    );

    if (!Number(result?.affectedRows || 0)) {
      return res.status(404).json({ error: "Assignation introuvable." });
    }

    return res.json({ ok: true, movieId, status });
  } catch (error) {
    console.error("[ASSIGNMENTS] status error:", error.message);
    return res.status(500).json({
      error: "Impossible de mettre a jour le statut de l'assignation.",
      details: error.message,
    });
  }
});

router.patch("/capacity/:adminId", async (req, res) => {
  if (req.auth?.role !== "superadmin") {
    return res.status(403).json({ error: "Seul un superadmin peut modifier les capacites." });
  }

  const targetAdminId = Number(req.params?.adminId);
  if (!Number.isFinite(targetAdminId) || targetAdminId <= 0) {
    return res.status(400).json({ error: "adminId invalide." });
  }

  const pool = getDbPool();
  const policy = getPolicy();

  const capacityMinutes = toInt(
    req.body?.capacityMinutes,
    policy.defaultCapacityMinutes,
    60,
    20000,
  );
  const manualRatio = toRatio(req.body?.manualRatio, policy.defaultManualRatio);
  const isActive = Number(req.body?.isActive ?? 1) === 1 ? 1 : 0;

  try {
    await ensureSchema(pool);

    const [userRows] = await pool.query(
      "SELECT id FROM users WHERE id = ? AND role IN ('admin', 'superadmin') LIMIT 1",
      [targetAdminId],
    );

    if (!userRows.length) {
      return res.status(404).json({ error: "Admin introuvable." });
    }

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
      [targetAdminId, capacityMinutes, manualRatio, isActive],
    );

    return res.json({ ok: true, adminId: targetAdminId, capacityMinutes, manualRatio, isActive: isActive === 1 });
  } catch (error) {
    console.error("[ASSIGNMENTS] capacity error:", error.message);
    return res.status(500).json({
      error: "Impossible de modifier la capacite de cet admin.",
      details: error.message,
    });
  }
});

router.get("/my", async (req, res) => {
  const adminId = Number(req.auth?.userId);
  if (!Number.isFinite(adminId) || adminId <= 0) {
    return res.status(401).json({ error: "Session invalide." });
  }

  const pool = getDbPool();
  const policy = getPolicy();

  try {
    await ensureSchema(pool);

    const [[assignmentRows], [reviewerRows], [myPendingRows]] = await Promise.all([
      pool.query(
        `
          SELECT movie_id, status, source
          FROM movie_review_assignments
          WHERE admin_id = ?
        `,
        [adminId],
      ),
      pool.query(
        `
          SELECT movie_id, COUNT(*) AS reviewers_count
          FROM movie_review_assignments
          WHERE status IN (${COUNTED_STATUSES_SQL})
          GROUP BY movie_id
        `,
      ),
      pool.query(
        `
          SELECT COALESCE(SUM(COALESCE(m.duration, 0)), 0) AS total
          FROM movie_review_assignments a
          JOIN movies m ON m.id = a.movie_id
          WHERE a.admin_id = ?
            AND a.status IN (${PENDING_STATUSES_SQL})
        `,
        [adminId],
      ),
    ]);

    const assignmentByMovie = Object.fromEntries(
      assignmentRows.map((row) => [
        String(row.movie_id),
        { status: String(row.status || "assigned"), source: String(row.source || "auto") },
      ]),
    );

    const reviewerCountByMovie = Object.fromEntries(
      reviewerRows.map((row) => [String(row.movie_id), Number(row.reviewers_count || 0)]),
    );

    return res.json({
      ok: true,
      policy,
      assignmentByMovie,
      reviewerCountByMovie,
      myPendingMinutes: Number(myPendingRows?.[0]?.total || 0),
    });
  } catch (error) {
    console.error("[ASSIGNMENTS] my error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger mes assignations.",
      details: error.message,
    });
  }
});

router.get("/workload", async (req, res) => {
  const adminId = Number(req.auth?.userId);
  if (!Number.isFinite(adminId) || adminId <= 0) {
    return res.status(401).json({ error: "Session invalide." });
  }

  const includeAll = req.auth?.role === "superadmin" && String(req.query?.all || "") === "1";
  const pool = getDbPool();

  try {
    await ensureSchema(pool);
    const workloads = await fetchWorkloads(pool, {
      all: includeAll,
      currentAdminId: adminId,
    });

    return res.json({ ok: true, workloads });
  } catch (error) {
    console.error("[ASSIGNMENTS] workload error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger la charge des admins.",
      details: error.message,
    });
  }
});

export default router;
