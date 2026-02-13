const Movie = require("../models/Movie");

exports.getAllMovies = async (req, res) => {
  try {
    const results = await Movie.findAll();

    const formatted = results.map((m) => ({
      ...m,
      genre: m.genre ? m.genre.split(",").map((g) => g.trim()) : ["All"],
    }));

    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getMovieById = async (req, res) => {
  const { id } = req.params;
  try {
    const movie = await Movie.findById(id);

    if (!movie) {
      return res.status(404).json({ error: "Film non trouvé" });
    }

    // Formatage complet pour la vue détaillée
    res.json({
      ...movie,
      genre: movie.genre ? movie.genre.split(",").map((g) => g.trim()) : [],
      aiTools: movie.aiTools
        ? movie.aiTools.split(",").map((t) => t.trim())
        : [],
      cast:
        typeof movie.cast === "string"
          ? JSON.parse(movie.cast)
          : movie.cast || [],
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Enregistrer ou modifier une note
exports.rateMovie = async (req, res) => {
  const { id } = req.params;
  const { score } = req.body;
  try {
    await Movie.saveRating(id, score);
    res.status(200).json({ message: "Note mise à jour avec succès" });
  } catch (err) {
    console.error("Erreur Controller:", err);
    res
      .status(500)
      .json({ error: "Erreur lors de l'enregistrement de la note" });
  }
};

// Supprimer une note
exports.deleteMovieRating = async (req, res) => {
  const { id } = req.params;
  try {
    await Movie.deleteRating(id);
    res.status(200).json({ message: "Note supprimée avec succès" });
  } catch (err) {
    res.status(500).json({ error: "Erreur lors de la suppression de la note" });
  }
};
