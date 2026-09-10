import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";
import { PGlite } from "@electric-sql/pglite";

const migrationsDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "db/migrations");

test("club A cannot read club B courts or players", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "padelapp-iso-"));
  const db = new PGlite(dir);
  await db.waitReady;
  await db.exec(`
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
    await db.exec(fs.readFileSync(path.join(migrationsDir, file), "utf8"));
  }

  const clubA = await db.query<{ id: string }>(
    "INSERT INTO clubs (slug, name) VALUES ('iso-a', 'Iso A') RETURNING id",
  );
  const clubB = await db.query<{ id: string }>(
    "INSERT INTO clubs (slug, name) VALUES ('iso-b', 'Iso B') RETURNING id",
  );
  const aId = clubA.rows[0]?.id;
  const bId = clubB.rows[0]?.id;
  assert.ok(aId && bId);

  await db.query(
    `INSERT INTO courts (club_id, name, kind, open_time, close_time, sort_order)
     VALUES ($1, 'Court A', 'indoor', '08:00', '22:00', 0), ($2, 'Court B', 'outdoor', '09:00', '21:00', 0)`,
    [aId, bId],
  );
  await db.query(
    `INSERT INTO players (club_id, display_name) VALUES ($1, 'Anna A'), ($2, 'Ben B')`,
    [aId, bId],
  );

  const courtsA = await db.query<{ name: string }>(
    "SELECT name FROM courts WHERE club_id = $1",
    [aId],
  );
  const playersA = await db.query<{ display_name: string }>(
    "SELECT display_name FROM players WHERE club_id = $1",
    [aId],
  );
  const stolenCourt = await db.query<{ id: string }>(
    "SELECT id FROM courts WHERE id = (SELECT id FROM courts WHERE club_id = $1) AND club_id = $2",
    [bId, aId],
  );
  const stolenPlayer = await db.query<{ id: string }>(
    "SELECT id FROM players WHERE display_name = 'Ben B' AND club_id = $1",
    [aId],
  );

  assert.deepEqual(
    courtsA.rows.map((row) => row.name),
    ["Court A"],
  );
  assert.deepEqual(
    playersA.rows.map((row) => row.display_name),
    ["Anna A"],
  );
  assert.equal(stolenCourt.rows.length, 0);
  assert.equal(stolenPlayer.rows.length, 0);

  await db.close();
  fs.rmSync(dir, { recursive: true, force: true });
});
