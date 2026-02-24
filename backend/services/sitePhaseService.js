import { getDbPool } from "../db.js";
import {
  SITE_PHASE_MODE_VALUES,
  SITE_PHASE_VALUES,
  countPhase2SelectedMovies,
  countPhase3SelectedMovies,
  deletePhase2MovieSelection,
  deletePhase3MovieSelection,
  ensureSitePhaseSchema,
  fetchCurrentSitePhase,
  fetchPhase2SelectedMovies,
  fetchPhase3SelectedMovies,
  insertPhase2MovieSelection,
  insertPhase3MovieSelection,
  isMovieSelectedForPhase2,
  isMovieSelectedForPhase3,
  pruneMoviesOutsidePhase2Selection,
  setPhase2ReadyFlag,
  setPhase3ReadyFlag,
  updateCurrentSitePhase,
} from "../models/sitePhaseModel.js";

const MIN_PHASE2_SELECTION = 50;
const MIN_PHASE3_SELECTION = 5;

function createHttpError(statusCode, message) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function toIsoStringOrNull(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function normalizePhase(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SITE_PHASE_VALUES.includes(normalized) ? normalized : null;
}

function normalizeMode(value) {
  const normalized = String(value || "").trim().toLowerCase();
  return SITE_PHASE_MODE_VALUES.includes(normalized) ? normalized : null;
}

function mapSitePhaseRow(row) {
  if (!row) return null;
  const updatedByName = `${row.updated_by_first_name || ""} ${row.updated_by_last_name || ""}`
    .trim();
  const phase2ReadyByName = `${row.phase2_ready_by_first_name || ""} ${row.phase2_ready_by_last_name || ""}`
    .trim();
  const phase3ReadyByName = `${row.phase3_ready_by_first_name || ""} ${row.phase3_ready_by_last_name || ""}`
    .trim();

  return {
    id: Number(row.id),
    currentPhase: String(row.current_phase || "phase_1"),
    mode: String(row.mode || "manual"),
    phase1EndsAt: toIsoStringOrNull(row.phase_1_ends_at),
    phase2EndsAt: toIsoStringOrNull(row.phase_2_ends_at),
    phase3EndsAt: toIsoStringOrNull(row.phase_3_ends_at),
    phase2Ready: Number(row.phase_2_ready || 0) === 1,
    phase2ReadyBy: row.phase_2_ready_by == null ? null : Number(row.phase_2_ready_by),
    phase2ReadyByName: phase2ReadyByName || null,
    phase2ReadyAt: toIsoStringOrNull(row.phase_2_ready_at),
    phase3Ready: Number(row.phase_3_ready || 0) === 1,
    phase3ReadyBy: row.phase_3_ready_by == null ? null : Number(row.phase_3_ready_by),
    phase3ReadyByName: phase3ReadyByName || null,
    phase3ReadyAt: toIsoStringOrNull(row.phase_3_ready_at),
    updatedBy: row.updated_by == null ? null : Number(row.updated_by),
    updatedByName: updatedByName || null,
    updatedAt: toIsoStringOrNull(row.updated_at),
  };
}

async function getOrCreateCurrentState(pool) {
  await ensureSitePhaseSchema(pool);
  const row = await fetchCurrentSitePhase(pool);
  if (row) return row;
  throw createHttpError(500, "Impossible de lire l'etat des phases.");
}

export async function getSitePhaseState() {
  const pool = getDbPool();
  const [row, phase2SelectedCount, phase3SelectedCount] = await Promise.all([
    getOrCreateCurrentState(pool),
    countPhase2SelectedMovies(pool),
    countPhase3SelectedMovies(pool),
  ]);

  return {
    ...mapSitePhaseRow(row),
    phase2SelectedCount,
    phase2SelectionMinRequired: MIN_PHASE2_SELECTION,
    phase3SelectedCount,
    phase3SelectionMinRequired: MIN_PHASE3_SELECTION,
  };
}

function toTimestamp(value) {
  if (!value) return null;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.getTime();
}

function toSelectionMovie(row) {
  return {
    id: Number(row.id),
    title: String(row.title || "Sans titre"),
    posterUrl: String(row.poster_url || "").trim(),
    director: String(row.submitted_by || "Anonyme").trim() || "Anonyme",
    countryCode: String(row.country_alpha2 || "").trim().toLowerCase() || null,
    country: String(row.country_name_fr || "").trim() || "Inconnu",
    countryFlagPath: String(row.country_flag_path || "").trim() || null,
    selectionCriteria: String(row.selection_criteria || "").trim() || "Phase 2",
    addedAt: toIsoStringOrNull(row.added_at),
  };
}

async function getPhase2SelectionSnapshot(pool) {
  const [selectedCount, selectedRows] = await Promise.all([
    countPhase2SelectedMovies(pool),
    fetchPhase2SelectedMovies(pool),
  ]);

  return {
    selectedCount,
    minRequired: MIN_PHASE2_SELECTION,
    selectedMovies: selectedRows.map(toSelectionMovie),
  };
}

async function getPhase3SelectionSnapshot(pool) {
  const [selectedCount, selectedRows] = await Promise.all([
    countPhase3SelectedMovies(pool),
    fetchPhase3SelectedMovies(pool),
  ]);

  return {
    selectedCount,
    minRequired: MIN_PHASE3_SELECTION,
    selectedMovies: selectedRows.map(toSelectionMovie),
  };
}

export async function getPhase2SelectionStatus() {
  const pool = getDbPool();
  const [stateRow, snapshot] = await Promise.all([
    getOrCreateCurrentState(pool),
    getPhase2SelectionSnapshot(pool),
  ]);
  const state = mapSitePhaseRow(stateRow);

  return {
    selectedCount: snapshot.selectedCount,
    minRequired: snapshot.minRequired,
    selectedMovies: snapshot.selectedMovies,
    isReadyBySuperadmin: Boolean(state?.phase2Ready),
    readyBy: state?.phase2ReadyBy || null,
    readyByName: state?.phase2ReadyByName || null,
    readyAt: state?.phase2ReadyAt || null,
  };
}

export async function getPhase3SelectionStatus() {
  const pool = getDbPool();
  const [stateRow, snapshot] = await Promise.all([
    getOrCreateCurrentState(pool),
    getPhase3SelectionSnapshot(pool),
  ]);
  const state = mapSitePhaseRow(stateRow);

  return {
    selectedCount: snapshot.selectedCount,
    minRequired: snapshot.minRequired,
    selectedMovies: snapshot.selectedMovies,
    isReadyBySuperadmin: Boolean(state?.phase3Ready),
    readyBy: state?.phase3ReadyBy || null,
    readyByName: state?.phase3ReadyByName || null,
    readyAt: state?.phase3ReadyAt || null,
  };
}

export async function getPhase3WinnersPublic() {
  const pool = getDbPool();
  await getOrCreateCurrentState(pool);
  const snapshot = await getPhase3SelectionSnapshot(pool);

  return {
    selectedCount: snapshot.selectedCount,
    selectedMovies: snapshot.selectedMovies,
  };
}

export async function togglePhase2Selection({
  movieId,
  selected,
  actorAdminId,
}) {
  const safeMovieId = Number(movieId);
  if (!Number.isFinite(safeMovieId) || safeMovieId <= 0) {
    throw createHttpError(400, "movieId invalide.");
  }

  const shouldSelect = Boolean(selected);
  const pool = getDbPool();
  await getOrCreateCurrentState(pool);

  if (shouldSelect) {
    const alreadySelected = await isMovieSelectedForPhase2(pool, safeMovieId);
    if (!alreadySelected) {
      const selectedCount = await countPhase2SelectedMovies(pool);
      if (selectedCount >= MIN_PHASE2_SELECTION) {
        throw createHttpError(
          400,
          `Quota phase 2 atteint: ${selectedCount}/${MIN_PHASE2_SELECTION}. Retire un film avant d'en ajouter un autre.`,
        );
      }
      try {
        await insertPhase2MovieSelection(pool, {
          movieId: safeMovieId,
          selectionCriteria: "Phase 2",
          selectedBy: actorAdminId || null,
        });
      } catch (error) {
        const message = String(error?.message || "");
        if (String(error?.code || "") === "ER_SIGNAL_EXCEPTION") {
          throw createHttpError(400, message || "Limite de selection atteinte.");
        }
        if (String(error?.code || "") === "ER_DUP_ENTRY") {
          // Ignore duplicate races and continue.
        } else {
          throw error;
        }
      }
    }
  } else {
    await deletePhase2MovieSelection(pool, safeMovieId);
  }

  await setPhase2ReadyFlag(pool, { isReady: false, readyBy: null });
  const status = await getPhase2SelectionStatus();
  return {
    ...status,
    changedMovieId: safeMovieId,
    changedSelected: shouldSelect,
    changedBy: actorAdminId || null,
  };
}

export async function togglePhase3Selection({
  movieId,
  selected,
  actorAdminId,
}) {
  const safeMovieId = Number(movieId);
  if (!Number.isFinite(safeMovieId) || safeMovieId <= 0) {
    throw createHttpError(400, "movieId invalide.");
  }

  const shouldSelect = Boolean(selected);
  const pool = getDbPool();
  await getOrCreateCurrentState(pool);

  if (shouldSelect) {
    const availableForPhase3 = await isMovieSelectedForPhase2(pool, safeMovieId);
    if (!availableForPhase3) {
      throw createHttpError(
        400,
        "Ce film n'est pas dans la selection phase 2 et ne peut pas etre promu en phase 3.",
      );
    }

    const alreadySelected = await isMovieSelectedForPhase3(pool, safeMovieId);
    if (!alreadySelected) {
      const selectedCount = await countPhase3SelectedMovies(pool);
      if (selectedCount >= MIN_PHASE3_SELECTION) {
        throw createHttpError(
          400,
          `Quota phase 3 atteint: ${selectedCount}/${MIN_PHASE3_SELECTION}. Retire un film avant d'en ajouter un autre.`,
        );
      }
      try {
        await insertPhase3MovieSelection(pool, {
          movieId: safeMovieId,
          selectionCriteria: "Phase 3",
          selectedBy: actorAdminId || null,
        });
      } catch (error) {
        if (String(error?.code || "") === "ER_DUP_ENTRY") {
          // Ignore duplicate races and continue.
        } else {
          throw error;
        }
      }
    }
  } else {
    await deletePhase3MovieSelection(pool, safeMovieId);
  }

  await setPhase3ReadyFlag(pool, { isReady: false, readyBy: null });
  const status = await getPhase3SelectionStatus();
  return {
    ...status,
    changedMovieId: safeMovieId,
    changedSelected: shouldSelect,
    changedBy: actorAdminId || null,
  };
}

export async function validatePhase2Selection({ actorAdminId, actorRole }) {
  if (String(actorRole || "") !== "superadmin") {
    throw createHttpError(403, "Seul un superadmin peut valider la selection phase 2.");
  }

  const pool = getDbPool();
  const currentRow = await getOrCreateCurrentState(pool);
  const selectedCount = await countPhase2SelectedMovies(pool);

  if (selectedCount !== MIN_PHASE2_SELECTION) {
    throw createHttpError(
      400,
      `Selection invalide: ${selectedCount}/${MIN_PHASE2_SELECTION}. Il faut exactement ${MIN_PHASE2_SELECTION} films.`,
    );
  }

  await setPhase2ReadyFlag(pool, {
    isReady: true,
    readyBy: actorAdminId || null,
  });

  let phaseTransition = null;
  let transitionErrorMessage = null;

  try {
    const currentPhaseKey = String(currentRow?.current_phase || "").toLowerCase();
    if (currentPhaseKey === "phase_1" || currentPhaseKey === "phase_2") {
      phaseTransition = await setSitePhaseState({
        currentPhase: "phase_2",
        mode: String(currentRow?.mode || "manual"),
        updatedBy: actorAdminId || null,
        actorRole,
      });
    }
  } catch (transitionError) {
    transitionErrorMessage = String(transitionError?.message || "Passage automatique en phase 2 impossible.");
  }

  const status = await getPhase2SelectionStatus();
  if (phaseTransition || transitionErrorMessage) {
    return {
      ...status,
      phaseTransition: phaseTransition || null,
      phaseTransitionError: transitionErrorMessage,
    };
  }

  return status;
}

export async function validatePhase3Selection({ actorAdminId, actorRole }) {
  if (String(actorRole || "") !== "superadmin") {
    throw createHttpError(403, "Seul un superadmin peut valider la selection phase 3.");
  }

  const pool = getDbPool();
  await getOrCreateCurrentState(pool);
  const selectedCount = await countPhase3SelectedMovies(pool);

  if (selectedCount !== MIN_PHASE3_SELECTION) {
    throw createHttpError(
      400,
      `Selection invalide: ${selectedCount}/${MIN_PHASE3_SELECTION}. Il faut exactement ${MIN_PHASE3_SELECTION} films.`,
    );
  }

  await setPhase3ReadyFlag(pool, {
    isReady: true,
    readyBy: actorAdminId || null,
  });

  return getPhase3SelectionStatus();
}

export async function setSitePhaseState({ currentPhase, mode, updatedBy, actorRole }) {
  const normalizedPhase = normalizePhase(currentPhase);
  const normalizedMode = normalizeMode(mode);

  if (currentPhase != null && !normalizedPhase) {
    throw createHttpError(
      400,
      `Phase invalide. Valeurs autorisees: ${SITE_PHASE_VALUES.join(", ")}`,
    );
  }
  if (mode != null && !normalizedMode) {
    throw createHttpError(
      400,
      `Mode invalide. Valeurs autorisees: ${SITE_PHASE_MODE_VALUES.join(", ")}`,
    );
  }
  if (!normalizedPhase && !normalizedMode) {
    throw createHttpError(400, "Aucune mise a jour de phase demandee.");
  }

  const pool = getDbPool();
  const currentRow = await getOrCreateCurrentState(pool);
  const nextPhase = normalizedPhase || currentRow.current_phase;
  const nextMode = normalizedMode || currentRow.mode;

  const currentPhaseKey = String(currentRow.current_phase || "").toLowerCase();
  const isPhase1ToPhase2 = nextPhase === "phase_2" && currentPhaseKey === "phase_1";
  const isExplicitPhase2Refresh =
    normalizedPhase === "phase_2"
    && nextPhase === "phase_2"
    && currentPhaseKey === "phase_2";
  let phase2SelectedCountAtTransition = null;

  if (isPhase1ToPhase2) {
    const selectedCount = await countPhase2SelectedMovies(pool);
    phase2SelectedCountAtTransition = selectedCount;
    const isReadyBySuperadmin = Number(currentRow.phase_2_ready || 0) === 1;
    const phase1EndTs = toTimestamp(currentRow.phase_1_ends_at);
    const nowTs = Date.now();

    if (!phase1EndTs) {
      throw createHttpError(
        400,
        "Date de fin de phase 1 absente. Configure phase_1_ends_at avant de passer en phase 2.",
      );
    }
    if (nowTs < phase1EndTs) {
      throw createHttpError(
        400,
        `Impossible de passer en phase 2 avant la fin de phase 1 (${new Date(phase1EndTs).toISOString()}).`,
      );
    }
    if (selectedCount !== MIN_PHASE2_SELECTION) {
      throw createHttpError(
        400,
        `Impossible de passer en phase 2: ${selectedCount}/${MIN_PHASE2_SELECTION}. Il faut exactement ${MIN_PHASE2_SELECTION} films selectionnes.`,
      );
    }
    if (!isReadyBySuperadmin) {
      throw createHttpError(
        400,
        "Validation superadmin manquante: valide la selection des 50 films avant de passer en phase 2.",
      );
    }
    if (String(actorRole || "") !== "superadmin") {
      throw createHttpError(
        403,
        "Seul un superadmin peut enclencher le passage en phase 2.",
      );
    }
  }

  if (nextPhase === "phase_3" && currentPhaseKey === "phase_2") {
    const selectedCount = await countPhase3SelectedMovies(pool);
    const isReadyBySuperadmin = Number(currentRow.phase_3_ready || 0) === 1;
    const phase2EndTs = toTimestamp(currentRow.phase_2_ends_at);
    const nowTs = Date.now();

    if (!phase2EndTs) {
      throw createHttpError(
        400,
        "Date de fin de phase 2 absente. Configure phase_2_ends_at avant de passer en phase 3.",
      );
    }
    if (nowTs < phase2EndTs) {
      throw createHttpError(
        400,
        `Impossible de passer en phase 3 avant la fin de phase 2 (${new Date(phase2EndTs).toISOString()}).`,
      );
    }
    if (selectedCount !== MIN_PHASE3_SELECTION) {
      throw createHttpError(
        400,
        `Impossible de passer en phase 3: ${selectedCount}/${MIN_PHASE3_SELECTION}. Il faut exactement ${MIN_PHASE3_SELECTION} films selectionnes.`,
      );
    }
    if (!isReadyBySuperadmin) {
      throw createHttpError(
        400,
        "Validation superadmin manquante: valide la selection des 5 films avant de passer en phase 3.",
      );
    }
    if (String(actorRole || "") !== "superadmin") {
      throw createHttpError(
        403,
        "Seul un superadmin peut enclencher le passage en phase 3.",
      );
    }
  }

  if (isPhase1ToPhase2 && phase2SelectedCountAtTransition == null) {
    phase2SelectedCountAtTransition = await countPhase2SelectedMovies(pool);
  }
  let shouldPruneMoviesForPhase2 =
    isPhase1ToPhase2 && Number(phase2SelectedCountAtTransition || 0) > 0;

  if (!shouldPruneMoviesForPhase2 && isExplicitPhase2Refresh) {
    const selectedCount = await countPhase2SelectedMovies(pool);
    const isReadyBySuperadmin = Number(currentRow.phase_2_ready || 0) === 1;
    const canForcePrune =
      String(actorRole || "") === "superadmin"
      && isReadyBySuperadmin
      && selectedCount === MIN_PHASE2_SELECTION;

    if (canForcePrune) {
      phase2SelectedCountAtTransition = selectedCount;
      shouldPruneMoviesForPhase2 = true;
    }
  }

  const connection = await pool.getConnection();
  let phase2PruneSummary = null;

  try {
    await connection.beginTransaction();

    await updateCurrentSitePhase(connection, {
      currentPhase: nextPhase,
      mode: nextMode,
      updatedBy,
    });

    if (shouldPruneMoviesForPhase2) {
      phase2PruneSummary = await pruneMoviesOutsidePhase2Selection(connection);
    }

    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }

  const updatedRow = await fetchCurrentSitePhase(pool);
  const mappedState = mapSitePhaseRow(updatedRow);

  if (phase2PruneSummary) {
    return {
      ...mappedState,
      phase2PruneSummary,
    };
  }

  return mappedState;
}
