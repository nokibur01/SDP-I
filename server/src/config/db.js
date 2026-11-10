import mysql from "mysql2";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

// Always load server/.env regardless of the working directory the process was started from.
// (This module is imported before server.js body runs, so it must load env itself.)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env"), quiet: true });

const isProduction = process.env.NODE_ENV === "production";

// Production Security Check: No empty passwords or missing credentials in production
if (isProduction) {
  if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.trim() === "") {
    console.error("FATAL CONFIG ERROR: Empty DB_PASSWORD is not permitted in production.");
    process.exit(1);
  }
  if (!process.env.DB_USER || process.env.DB_USER.trim() === "") {
    console.error("FATAL CONFIG ERROR: DB_USER is required in production.");
    process.exit(1);
  }
}

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "batchhub_db",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

export default pool.promise();
