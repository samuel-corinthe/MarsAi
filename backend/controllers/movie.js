import { getMovieDetails, listMovies, toMovieId } from "../services/movieService.js";
import { getPhase2SelectionStatus, getSitePhaseState } from "../services/sitePhaseService.js";
import { getSessionFromRequest } from "../services/authService.js";

function isAdminSession(session) {
  return ["admin", "superadmin"].includes(String(session?.role || "").toLowerCase());
}

async function enforceMovieAccessForCurrentPhase(req) {
  const sitePhase = await getSitePhaseState();
  const phaseKey = String(sitePhase?.currentPhase || "").toLowerCase();

  if (phaseKey !== "phase_1") return;

  const session = getSessionFromRequest(req);
  if (isAdminSession(session)) return;

  const error = new Error("Acces galerie reserve aux sessions admin pendant la phase 1.");
  error.statusCode = 403;
  throw error;
}

async function getVisibleMovieIdsForCurrentPhase() {
  const sitePhase = await getSitePhaseState();
  const phaseKey = String(sitePhase?.currentPhase || "").toLowerCase();

  if (phaseKey === "phase_2" || phaseKey === "phase_3") {
    const selection = await getPhase2SelectionStatus();
    const visibleIds = new Set(
      (Array.isArray(selection?.selectedMovies) ? selection.selectedMovies : [])
        .map((movie) => Number(movie?.id))
        .filter((movieId) => Number.isFinite(movieId) && movieId > 0),
    );
    return { phaseKey, visibleIds };
  }

  return { phaseKey, visibleIds: null };
}

export async function getAllMovies(req, res) {
  try {
    await enforceMovieAccessForCurrentPhase(req);
    const [movies, visibility] = await Promise.all([
      listMovies(),
      getVisibleMovieIdsForCurrentPhase(),
    ]);

    if (visibility.visibleIds) {
      const filteredMovies = movies.filter((movie) =>
        visibility.visibleIds.has(Number(movie?.id)),
      );
      return res.json({ ok: true, movies: filteredMovies });
    }

    return res.json({ ok: true, movies });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("[MOVIES] list error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger la liste des films.",
      details: error.message,
    });
  }
}

export async function getMovieById(req, res) {
  const movieId = toMovieId(req.params.id);
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    await enforceMovieAccessForCurrentPhase(req);
    const [movie, visibility] = await Promise.all([
      getMovieDetails({ movieId }),
      getVisibleMovieIdsForCurrentPhase(),
    ]);
    if (!movie) {
      return res.status(404).json({ error: "Film introuvable." });
    }
    if (visibility.visibleIds && !visibility.visibleIds.has(movieId)) {
      return res.status(404).json({ error: "Film introuvable." });
    }

    return res.json({ ok: true, movie });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }
    console.error("[MOVIES] details error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les details du film.",
      details: error.message,
    });
  }
}
