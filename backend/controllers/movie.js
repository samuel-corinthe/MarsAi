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
