import {
  runAutoAssign,
  runRebalance,
  claimMovie,
  releaseMovie,
  setAssignmentStatus,
  setAdminCapacity,
  getMyAssignments,
  getWorkload,
  toPositiveInt,
  isAllowedStatus,
  normalizeCapacityInput,
} from "../services/assignmentService.js";

function sendServiceError({ res, error, logLabel, defaultError }) {
  if (error?.statusCode) {
    return res.status(error.statusCode).json({ error: error.message });
  }

  console.error(logLabel, error.message);
  return res.status(500).json({
    error: defaultError,
    details: error.message,
  });
}

export async function autoAssign(req, res) {
  if (req.auth?.role !== "superadmin") {
    return res.status(403).json({ error: "Seul un superadmin peut lancer la repartition automatique." });
  }

  try {
    const result = await runAutoAssign({
      actorAdminId: toPositiveInt(req.auth?.userId),
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[ASSIGNMENTS] auto-assign error:",
      defaultError: "Impossible de lancer la repartition automatique.",
    });
  }
}

export async function rebalance(req, res) {
  if (req.auth?.role !== "superadmin") {
    return res.status(403).json({ error: "Seul un superadmin peut reequilibrer les assignations." });
  }

  try {
    const result = await runRebalance({
      actorAdminId: toPositiveInt(req.auth?.userId),
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[ASSIGNMENTS] rebalance error:",
      defaultError: "Impossible de reequilibrer les assignations.",
    });
  }
}

export async function claim(req, res) {
  const adminId = toPositiveInt(req.auth?.userId);
  const movieId = toPositiveInt(req.body?.movieId);

  if (!adminId) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    const result = await claimMovie({ adminId, movieId });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[ASSIGNMENTS] claim error:",
      defaultError: "Impossible de prendre ce film.",
    });
  }
}

export async function release(req, res) {
  const adminId = toPositiveInt(req.auth?.userId);
  const movieId = toPositiveInt(req.body?.movieId);

  if (!adminId) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    const result = await releaseMovie({ adminId, movieId });
    return res.json({ ok: true, ...result });
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[ASSIGNMENTS] release error:",
      defaultError: "Impossible de retirer ce film.",
    });
  }
}

export async function status(req, res) {
  const adminId = toPositiveInt(req.auth?.userId);
  const movieId = toPositiveInt(req.body?.movieId);
  const normalizedStatus = String(req.body?.status || "").trim();

  if (!adminId) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }
  if (!isAllowedStatus(normalizedStatus)) {
    return res.status(400).json({ error: "status invalide." });
  }

  try {
    const result = await setAssignmentStatus({
      adminId,
      movieId,
      status: normalizedStatus,
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[ASSIGNMENTS] status error:",
      defaultError: "Impossible de mettre a jour le statut de l'assignation.",
    });
  }
}

export async function patchCapacity(req, res) {
  if (req.auth?.role !== "superadmin") {
    return res.status(403).json({ error: "Seul un superadmin peut modifier les capacites." });
  }

  const targetAdminId = toPositiveInt(req.params?.adminId);
  if (!targetAdminId) {
    return res.status(400).json({ error: "adminId invalide." });
  }

  const normalized = normalizeCapacityInput(req.body || {});

  try {
    const result = await setAdminCapacity({
      targetAdminId,
      capacityMinutes: normalized.capacityMinutes,
      manualRatio: normalized.manualRatio,
      isActive: normalized.isActive,
    });

    return res.json({ ok: true, ...result });
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[ASSIGNMENTS] capacity error:",
      defaultError: "Impossible de modifier la capacite de cet admin.",
    });
  }
}

export async function my(req, res) {
  const adminId = toPositiveInt(req.auth?.userId);
  if (!adminId) {
    return res.status(401).json({ error: "Session invalide." });
  }

  try {
    const payload = await getMyAssignments({ adminId });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[ASSIGNMENTS] my error:",
      defaultError: "Impossible de charger mes assignations.",
    });
  }
}

export async function workload(req, res) {
  const adminId = toPositiveInt(req.auth?.userId);
  if (!adminId) {
    return res.status(401).json({ error: "Session invalide." });
  }

  const includeAll = req.auth?.role === "superadmin" && String(req.query?.all || "") === "1";

  try {
    const payload = await getWorkload({ adminId, includeAll });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[ASSIGNMENTS] workload error:",
      defaultError: "Impossible de charger la charge des admins.",
    });
  }
}
