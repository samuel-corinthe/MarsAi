import mysql from "mysql2/promise";

const dbPort = Number(process.env.DB_PORT || 3306);

const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number.isFinite(dbPort) ? dbPort : 3306,
  user: process.env.DB_USER || "",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "",
  connectionLimit: 10,
  waitForConnections: true,
  queueLimit: 0,
});

export function getDbPool() {
  return pool;
}

export async function pingDatabase() {
  await pool.query("SELECT 1");
}
