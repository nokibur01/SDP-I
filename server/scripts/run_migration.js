// Usage (from the project root or server/):
//   npm --prefix server run migrate -- 05_batch_scoping.sql
// Runs one SQL file from database/migrations against the database in server/.env.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mysql from "mysql2/promise";
import dotenv from "dotenv";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env"), quiet: true });

const name = process.argv[2];
if (!name) {
  console.error("Usage: npm run migrate -- <file in database/migrations>");
  process.exit(1);
}
const file = path.resolve(__dirname, "../../database/migrations", path.basename(name));
if (!fs.existsSync(file)) {
  console.error(`Migration not found: ${file}`);
  process.exit(1);
}

const conn = await mysql.createConnection({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "batchhub_db",
  multipleStatements: true,
});

try {
  await conn.query(fs.readFileSync(file, "utf8"));
  console.log(`✓ Applied ${path.basename(file)}`);
} catch (err) {
  console.error(`✗ Migration failed: ${err.message}`);
  process.exitCode = 1;
} finally {
  await conn.end();
}
