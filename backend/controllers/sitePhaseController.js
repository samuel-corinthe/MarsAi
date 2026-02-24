import {
  getPhase2SelectionStatus,
  getPhase3SelectionStatus,
  getPhase3WinnersPublic,
  getSitePhaseState,
  setSitePhaseState,
  togglePhase2Selection,
  togglePhase3Selection,
  validatePhase2Selection,
  validatePhase3Selection,
} from "../services/sitePhaseService.js";

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

export async function getSitePhase(req, res) {
  try {
    const payload = await getSitePhaseState();
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] get error:",
      defaultError: "Impossible de lire la phase active.",
    });
  }
}

export async function patchSitePhase(req, res) {
  try {
    const payload = await setSitePhaseState({
      currentPhase: req.body?.currentPhase,
      mode: req.body?.mode,
      updatedBy: Number(req.auth?.userId) || null,
      actorRole: req.auth?.role,
    });

    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] patch error:",
      defaultError: "Impossible de mettre a jour la phase active.",
    });
  }
}

export async function getPhase2Selection(req, res) {
  try {
    const payload = await getPhase2SelectionStatus();
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] get phase2 selection error:",
      defaultError: "Impossible de lire la selection phase 2.",
    });
  }
}

export async function patchPhase2Selection(req, res) {
  const movieId = Number(req.body?.movieId);
  const selected = Boolean(req.body?.selected);
  const actorAdminId = Number(req.auth?.userId) || null;

  try {
    const payload = await togglePhase2Selection({
      movieId,
      selected,
      actorAdminId,
    });
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] patch phase2 selection error:",
      defaultError: "Impossible de mettre a jour la selection phase 2.",
    });
  }
}

export async function postValidatePhase2Selection(req, res) {
  try {
    const payload = await validatePhase2Selection({
      actorAdminId: Number(req.auth?.userId) || null,
      actorRole: req.auth?.role,
    });
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] validate phase2 selection error:",
      defaultError: "Impossible de valider la selection phase 2.",
    });
  }
}

export async function getPhase3Selection(req, res) {
  try {
    const payload = await getPhase3SelectionStatus();
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] get phase3 selection error:",
      defaultError: "Impossible de lire la selection phase 3.",
    });
  }
}

export async function getPhase3Winners(req, res) {
  try {
    const payload = await getPhase3WinnersPublic();
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] get phase3 winners error:",
      defaultError: "Impossible de lire les gagnants phase 3.",
    });
  }
}

export async function patchPhase3Selection(req, res) {
  const movieId = Number(req.body?.movieId);
  const selected = Boolean(req.body?.selected);
  const actorAdminId = Number(req.auth?.userId) || null;

  try {
    const payload = await togglePhase3Selection({
      movieId,
      selected,
      actorAdminId,
    });
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] patch phase3 selection error:",
      defaultError: "Impossible de mettre a jour la selection phase 3.",
    });
  }
}

export async function postValidatePhase3Selection(req, res) {
  try {
    const payload = await validatePhase3Selection({
      actorAdminId: Number(req.auth?.userId) || null,
      actorRole: req.auth?.role,
    });
    return res.json(payload);
  } catch (error) {
    return sendServiceError({
      res,
      error,
      logLabel: "[SITE_PHASE] validate phase3 selection error:",
      defaultError: "Impossible de valider la selection phase 3.",
    });
  }
}
