const db = require("../config_file/db");

const Movie = {
  async findAll() {
    const [rows] = await db.query("SELECT * FROM movies");
    return rows;
  },

  async findById(id) {
    const [rows] = await db.query("SELECT * FROM movies WHERE id = ?", [id]);
    return rows[0];
  },
};

module.exports = Movie;
