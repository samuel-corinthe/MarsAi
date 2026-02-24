import { getMovieDetails, listMovies, toMovieId } from "../services/movieService.js";
import { getSitePhaseState } from "../services/sitePhaseService.js";
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

export async function getAllMovies(req, res) {
  try {
    await enforceMovieAccessForCurrentPhase(req);
    const movies = await listMovies();
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
    const movie = await getMovieDetails({ movieId });
    if (!movie) {
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
