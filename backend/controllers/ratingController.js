import {
  getMyMovieRating,
  upsertMyMovieRating,
  deleteMyMovieRating,
  toAdminId,
  toMovieId,
  toScore,
  toComment,
} from "../services/ratingService.js";

export async function getMyRating(req, res) {
  const adminId = toAdminId(req.auth?.userId);
  const movieId = toMovieId(req.params.movieId);

  if (!adminId) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    const payload = await getMyMovieRating({ adminId, movieId });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("[RATINGS] get my rating error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger la note du film.",
      details: error.message,
    });
  }
}

export async function patchMyRating(req, res) {
  const adminId = toAdminId(req.auth?.userId);
  const movieId = toMovieId(req.params.movieId);
  const score = toScore(req.body?.score);
  const normalizedComment = toComment(req.body?.comment);

  if (!adminId) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }
  if (!score) {
    return res.status(400).json({ error: "score invalide (1-5)." });
  }
  if (normalizedComment.error) {
    return res.status(400).json({ error: normalizedComment.error });
  }

  try {
    const payload = await upsertMyMovieRating({
      adminId,
      movieId,
      score,
      comment: normalizedComment.value,
    });

    return res.json({ ok: true, ...payload });
  } catch (error) {
    if (error?.statusCode) {
      return res.status(error.statusCode).json({ error: error.message });
    }

    console.error("[RATINGS] upsert rating error:", error.message);
    return res.status(500).json({
      error: "Impossible d'enregistrer la note.",
      details: error.message,
    });
  }
}

export async function deleteMyRating(req, res) {
  const adminId = toAdminId(req.auth?.userId);
  const movieId = toMovieId(req.params.movieId);

  if (!adminId) {
    return res.status(401).json({ error: "Session invalide." });
  }
  if (!movieId) {
    return res.status(400).json({ error: "movieId invalide." });
  }

  try {
    const payload = await deleteMyMovieRating({ adminId, movieId });
    return res.json({ ok: true, ...payload });
  } catch (error) {
    console.error("[RATINGS] delete rating error:", error.message);
    return res.status(500).json({
      error: "Impossible de supprimer la note.",
      details: error.message,
    });
  }
}
