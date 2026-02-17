import { getMovieDetails, listMovies, toMovieId } from "../services/movieService.js";

export async function getAllMovies(req, res) {
  try {
    const movies = await listMovies();
    return res.json({ ok: true, movies });
  } catch (error) {
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
    const movie = await getMovieDetails({ movieId });
    if (!movie) {
      return res.status(404).json({ error: "Film introuvable." });
    }

    return res.json({ ok: true, movie });
  } catch (error) {
    console.error("[MOVIES] details error:", error.message);
    return res.status(500).json({
      error: "Impossible de charger les details du film.",
      details: error.message,
    });
  }
}
