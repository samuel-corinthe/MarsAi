const mysql = require("mysql2");

const pool = mysql.createPool({
  host: "82.165.185.52",
  user: "samy",
  password: "YClfdmvjlm181200.",
  database: "samuel-corinthe_MarsAi",
  port: 3306,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Utilisation des promesses pour éviter les callbacks imbriqués
module.exports = pool.promise();
