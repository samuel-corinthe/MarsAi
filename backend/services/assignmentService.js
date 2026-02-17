import { getDbPool } from "../db.js";
import {
  ensureAssignmentSchema,
  fetchAdminsWithCapacity,
  fetchMoviesBasic,
  fetchAssignmentsBasic,
  insertAssignmentsBatch,
  moveAssignmentsBatch,
  findMovieForUpdate,
  findExistingAssignmentForUpdate,
  countMovieReviewersForUpdate,
  ensureCapacityProfileForAdmin,
  fetchCapacityProfileForUpdate,
  fetchManualPendingMinutesForUpdate,
  insertManualAssignment,
  findAssignmentForReleaseForUpdate,
  countRemainingReviewersForRelease,
  deleteAssignmentById,
  updateAssignmentStatus,
  findAdminUserById,
  upsertAdminCapacityProfile,
  fetchMyAssignmentsRows,
  fetchReviewerCountRows,
  fetchMyPendingMinutes,
  fetchWorkloadRows,
} from "../models/assignmentModel.js";

const COUNTED_STATUSES = ["assigned", "in_progress", "completed"];
const PENDING_STATUSES = ["assigned", "in_progress"];
const ALLOWED_STATUSES = new Set(COUNTED_STATUSES);
const ALLOWED_SOURCES = new Set(["auto", "manual", "rebalance", "swap"]);

const COUNTED_STATUSES_SQL = "'assigned','in_progress','completed'";
const PENDING_STATUSES_SQL = "'assigned','in_progress'";

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

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

export function toPositiveInt(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getPolicy() {
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

export function isAllowedStatus(status) {
  return ALLOWED_STATUSES.has(status);
}

function mapAdmins(rows, policy) {
  return rows.map((row) => ({
    id: Number(row.id),
    email: row.email,
    role: row.role,
    capacityMinutes: Math.max(60, Number(row.capacity_minutes || policy.defaultCapacityMinutes)),
    manualRatio: Math.max(0, Math.min(Number(row.manual_ratio ?? policy.defaultManualRatio), 0.9)),
    isActive: Number(row.is_active || 0) === 1,
  }));
}

function mapMovies(rows) {
  return rows.map((row) => ({
    id: Number(row.id),
    title: row.title,
    duration: Math.max(1, Number(row.duration || 1)),
  }));
}

function mapAssignments(rows) {
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

async function ensureSchema(pool) {
  const policy = getPolicy();
  await ensureAssignmentSchema(pool, policy);
  return policy;
}

async function autoAssignMissingReviews({ pool, actorAdminId, source = "auto" }) {
  if (!ALLOWED_SOURCES.has(source)) {
    throw new Error(`invalid_assignment_source:${source}`);
  }

  const policy = await ensureSchema(pool);

  const [adminRows, movieRows, assignmentRows] = await Promise.all([
    fetchAdminsWithCapacity(pool, policy),
    fetchMoviesBasic(pool),
    fetchAssignmentsBasic(pool),
  ]);

  const admins = mapAdmins(adminRows, policy);
  const movies = mapMovies(movieRows);
  const assignments = mapAssignments(assignmentRows);

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

  const createdAssignments = await insertAssignmentsBatch(pool, inserts);

  const uncoveredMovies = movies.reduce(
    (total, movie) =>
      total + ((state.movieReviewerCounts.get(movie.id) || 0) < policy.minReviewers ? 1 : 0),
    0,
  );

  return { createdAssignments, uncoveredMovies };
}

async function rebalanceUnstartedAssignments({ pool, actorAdminId }) {
  const policy = await ensureSchema(pool);

  const [adminRows, movieRows, assignmentRows] = await Promise.all([
    fetchAdminsWithCapacity(pool, policy),
    fetchMoviesBasic(pool),
    fetchAssignmentsBasic(pool),
  ]);

  const admins = mapAdmins(adminRows, policy);
  const movies = mapMovies(movieRows);
  const assignments = mapAssignments(assignmentRows);

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
      const leftRatio = leftAdmin
        ? adminRatio(leftAdmin, state.adminPendingMinutes.get(left.adminId) || 0)
        : 0;
      const rightRatio = rightAdmin
        ? adminRatio(rightAdmin, state.adminPendingMinutes.get(right.adminId) || 0)
        : 0;
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

  const movedAssignments = await moveAssignmentsBatch(
    pool,
    moves,
    Number.isFinite(actorAdminId) ? actorAdminId : null,
  );

  return { movedAssignments };
}

export async function runAutoAssign({ actorAdminId }) {
  const pool = getDbPool();
  return autoAssignMissingReviews({
    pool,
    actorAdminId,
    source: "auto",
  });
}

export async function runRebalance({ actorAdminId }) {
  const pool = getDbPool();

  const autoResult = await autoAssignMissingReviews({
    pool,
    actorAdminId,
    source: "rebalance",
  });

  const rebalanceResult = await rebalanceUnstartedAssignments({
    pool,
    actorAdminId,
  });

  return {
    createdAssignments: autoResult.createdAssignments,
    movedAssignments: rebalanceResult.movedAssignments,
    uncoveredMovies: autoResult.uncoveredMovies,
  };
}

export async function claimMovie({ adminId, movieId }) {
  const pool = getDbPool();
  const policy = await ensureSchema(pool);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const movie = await findMovieForUpdate(connection, movieId);
    if (!movie) {
      await connection.rollback();
      throw createHttpError(404, "Film introuvable.");
    }

    const movieDuration = Math.max(1, Number(movie.duration || 1));

    const existingAssignment = await findExistingAssignmentForUpdate(connection, movieId, adminId);
    if (existingAssignment) {
      await connection.rollback();
      throw createHttpError(409, "Ce film est deja assigne a cet admin.");
    }

    const reviewerCount = await countMovieReviewersForUpdate(
      connection,
      movieId,
      COUNTED_STATUSES_SQL,
    );
    if (reviewerCount >= policy.maxReviewers) {
      await connection.rollback();
      throw createHttpError(409, "Le film a deja atteint le nombre maximum de reviewers.");
    }

    await ensureCapacityProfileForAdmin(connection, adminId, policy);
    const capacityProfile = await fetchCapacityProfileForUpdate(connection, adminId);

    const capacity = Math.max(
      60,
      Number(capacityProfile?.capacity_minutes || policy.defaultCapacityMinutes),
    );
    const manualRatio = Math.max(
      0,
      Math.min(Number(capacityProfile?.manual_ratio ?? policy.defaultManualRatio), 0.9),
    );
    const isActive = Number(capacityProfile?.is_active || 0) === 1;

    if (!isActive) {
      await connection.rollback();
      throw createHttpError(409, "Cet admin est marque inactif pour les assignations.");
    }

    const manualPendingMinutes = await fetchManualPendingMinutesForUpdate(
      connection,
      adminId,
      PENDING_STATUSES_SQL,
    );
    const manualBudgetMinutes = Math.max(0, Math.round(capacity * manualRatio));

    if (manualBudgetMinutes > 0 && manualPendingMinutes + movieDuration > manualBudgetMinutes) {
      await connection.rollback();
      throw createHttpError(409, "Capacite manuelle depassee pour cet admin.");
    }

    await insertManualAssignment(connection, movieId, adminId);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { movieId, adminId };
}

export async function releaseMovie({ adminId, movieId }) {
  const pool = getDbPool();
  const policy = await ensureSchema(pool);
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    const assignment = await findAssignmentForReleaseForUpdate(connection, movieId, adminId);
    if (!assignment) {
      await connection.rollback();
      throw createHttpError(404, "Aucune assignation a retirer pour ce film.");
    }

    if (assignment.status !== "assigned") {
      await connection.rollback();
      throw createHttpError(409, "Seules les assignations non commencees peuvent etre retirees.");
    }

    const remainingCount = await countRemainingReviewersForRelease(
      connection,
      movieId,
      assignment.id,
      COUNTED_STATUSES_SQL,
    );

    if (remainingCount < policy.minReviewers) {
      await connection.rollback();
      throw createHttpError(409, "Impossible de retirer ce film: minimum de reviewers casse.");
    }

    await deleteAssignmentById(connection, assignment.id);
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  return { movieId, adminId };
}

export async function setAssignmentStatus({ adminId, movieId, status }) {
  const pool = getDbPool();
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

  const affectedRows = await updateAssignmentStatus(pool, setSql, updates);
  if (!affectedRows) {
    throw createHttpError(404, "Assignation introuvable.");
  }

  return { movieId, status };
}

export async function setAdminCapacity({ targetAdminId, capacityMinutes, manualRatio, isActive }) {
  const pool = getDbPool();
  await ensureSchema(pool);

  const user = await findAdminUserById(pool, targetAdminId);
  if (!user) {
    throw createHttpError(404, "Admin introuvable.");
  }

  await upsertAdminCapacityProfile(pool, {
    adminId: targetAdminId,
    capacityMinutes,
    manualRatio,
    isActive,
  });

  return {
    adminId: targetAdminId,
    capacityMinutes,
    manualRatio,
    isActive: isActive === 1,
  };
}

export async function getMyAssignments({ adminId }) {
  const pool = getDbPool();
  const policy = await ensureSchema(pool);

  const [assignmentRows, reviewerRows, myPendingMinutes] = await Promise.all([
    fetchMyAssignmentsRows(pool, adminId),
    fetchReviewerCountRows(pool, COUNTED_STATUSES_SQL),
    fetchMyPendingMinutes(pool, adminId, PENDING_STATUSES_SQL),
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

  return {
    policy,
    assignmentByMovie,
    reviewerCountByMovie,
    myPendingMinutes,
  };
}

export async function getWorkload({ adminId, includeAll }) {
  const pool = getDbPool();
  const policy = await ensureSchema(pool);

  const rows = await fetchWorkloadRows(pool, {
    all: includeAll,
    currentAdminId: adminId,
    policy,
    pendingStatusesSql: PENDING_STATUSES_SQL,
  });

  const workloads = rows.map((row) => {
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

  return { workloads };
}

export function normalizeCapacityInput(body = {}) {
  const policy = getPolicy();
  const capacityMinutes = toInt(
    body.capacityMinutes,
    policy.defaultCapacityMinutes,
    60,
    20000,
  );
  const manualRatio = toRatio(body.manualRatio, policy.defaultManualRatio);
  const isActive = Number(body.isActive ?? 1) === 1 ? 1 : 0;

  return {
    capacityMinutes,
    manualRatio,
    isActive,
  };
}
