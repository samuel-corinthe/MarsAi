const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors()); // Autorise ton React local à appeler ce serveur
app.use(express.json());

// Connexion à ta base MariaDB sur Plesk
const connection = mysql.createConnection({
  host: "82.165.185.52",
  user: "samy",
  password: "YClfdmvjlm181200.",
  database: "samuel-corinthe_MarsAi",
  port: 3306, // Port standard MariaDB
});

connection.connect((err) => {
  if (err) {
    console.error("Erreur de connexion MariaDB:", err.stack);
    return;
  }
  console.log("Connecté à MariaDB sur Plesk");
});

// Route pour récupérer les films
app.get("/movies", (req, res) => {
  const query = "SELECT * FROM movies";
  connection.query(query, (err, results) => {
    if (err) return res.status(500).json({ error: err.message });

    // Formater le genre (si stocké en chaîne "Action,Sci-Fi")
    const formatted = results.map((m) => ({
      ...m,
      genre: m.genre ? m.genre.split(",") : ["All"],
    }));
    res.json(formatted);
  });
});
app.get("/movies/:id", (req, res) => {
  const { id } = req.params;
  const query = "SELECT * FROM movies WHERE id = ?";

  connection.query(query, [id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0)
      return res.status(404).json({ error: "Film non trouvé" });

    const movie = results[0];

    // On parse les chaînes JSON ou les listes séparées par des virgules
    res.json({
      ...movie,
      genre: movie.genre ? movie.genre.split(",").map((g) => g.trim()) : [],
      aiTools: movie.aiTools
        ? movie.aiTools.split(",").map((t) => t.trim())
        : [],
      // Si votre cast est stocké en JSON dans MariaDB :
      cast: typeof movie.cast === "string" ? JSON.parse(movie.cast) : [],
    });
  });
});
app.listen(5000, () => console.log("API running on http://localhost:5000"));
