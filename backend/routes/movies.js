import express from 'express';
import connection from '../utils/db.js';

const router = express.Router();

router.get("/", (req, res) => {
    const sql = `
        SELECT m.*, c.name_fr AS country_name, c.alpha2 AS country_alpha2
        FROM movies m
        LEFT JOIN countries c ON m.country_id = c.id
        ORDER BY m.id DESC
    `;
    connection.query(sql, (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        const movies = results.map((movie) => ({
            ...movie,
            ai_tools: movie.ai_tools ? movie.ai_tools.split(",").map((t) => t.trim()) : [],
        }));
        res.json(movies);
    });
});

router.get("/countries", (req, res) => {
    connection.query("SELECT id, alpha2, name_fr FROM countries ORDER BY name_fr", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

router.get("/:id", (req, res) => {
    const sql = `
        SELECT m.*, c.name_fr AS country_name, c.alpha2 AS country_alpha2
        FROM movies m
        LEFT JOIN countries c ON m.country_id = c.id
        WHERE m.id = ?
    `;
    connection.query(sql, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        if (results.length === 0) return res.status(404).json({ error: "Le film n'a pas été trouvé" });

        const movie = results[0];
        res.json({
            ...movie,
            ai_tools: movie.ai_tools ? movie.ai_tools.split(",").map((t) => t.trim()) : [],
        });
    });
});

export default router;
