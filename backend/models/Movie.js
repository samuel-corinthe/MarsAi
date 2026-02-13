const db = require("../config_file/db");

const Movie = {
  // --- GALERIE
  async findAll() {
    const [rows] = await db.query("SELECT * FROM movies");
    return rows;
  },

  // --- DÉTAILS
  async findById(id) {
    const sql = `
      SELECT movies.*, admin_ratings.score 
      FROM movies 
      LEFT JOIN admin_ratings ON movies.id = admin_ratings.movie_id 
      WHERE movies.id = ?
    `;
    const [rows] = await db.query(sql, [id]);
    return rows[0]; // Retournera le film avec movie.score (qui sera null si pas noté)
  },

  // --- ACTIONS ADMIN ---
  async saveRating(movieId, score, adminId) {
    const sql = `
      INSERT INTO admin_ratings (movie_id, score, admin_id) 
      VALUES (?, ?, ?) 
      ON DUPLICATE KEY UPDATE score = ?, admin_id = ?
    `;
    const [result] = await db.query(sql, [
      movieId,
      score,
      adminId,
      score,
      adminId,
    ]);
    return result;
  },

  async deleteRating(movieId) {
    const sql = "DELETE FROM admin_ratings WHERE movie_id = ?";
    const [result] = await db.query(sql, [movieId]);
    return result;
  },
};

module.exports = Movie;
