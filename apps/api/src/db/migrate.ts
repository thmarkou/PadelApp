import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadPadelEnv } from "../env.js";
import { getPool } from "./pool.js";

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "migrations");

export async function applyMigrations(): Promise<void> {
  const pool = getPool();
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);

  const files = fs
    .readdirSync(migrationsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();

  for (const file of files) {
    const applied = await pool.query<{ id: string }>(
      "SELECT id FROM schema_migrations WHERE id = $1",
      [file],
    );
    if (applied.rows.length > 0) {
      continue;
    }
    const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
    await pool.query("BEGIN");
    try {
      await pool.exec(sql);
      await pool.query("INSERT INTO schema_migrations (id) VALUES ($1)", [file]);
      await pool.query("COMMIT");
      console.log(`applied ${file}`);
    } catch (error) {
      await pool.query("ROLLBACK");
      throw error;
    }
  }

  await pool.query(`
    ALTER TABLE tournament_matches
      ADD COLUMN IF NOT EXISTS closed BOOLEAN NOT NULL DEFAULT FALSE
  `);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) {
  loadPadelEnv();
  applyMigrations()
    .then(async () => {
      await getPool().end();
    })
    .catch((error: unknown) => {
      console.error(error);
      process.exit(1);
    });
}
