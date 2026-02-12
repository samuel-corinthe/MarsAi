import express from 'express';
import mysql from 'mysql2';

const router = express.Router();

const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

connection.connect((err)=>{
    if (err){
        console;error("Error de connexion à la base de donnée:",err);
        return;
    }
    console.log("Connection à la base de donnée sur le serveur réussie");
});

router.get("/:id", (req, res) => {
  connection.query("SELECT * FROM movies WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    if (results.length === 0) return res.status(404).json({ error: "Film non trouvé" });

    const movie = results[0];
    res.json({
      ...movie,
      genre: movie.genre ? movie.genre.split(",").map((g) => g.trim()) : [],
      aiTools: movie.aiTools ? movie.aiTools.split(",").map((t) => t.trim()) : [],
      cast: typeof movie.cast === "string" ? JSON.parse(movie.cast) : [],
    });
  });
});

export default router;
