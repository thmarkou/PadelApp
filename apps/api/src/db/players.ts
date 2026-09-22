import type { Player, PlayerGender } from "@padelapp/shared";
import { query } from "./pool.js";

type PlayerRow = {
  id: string;
  club_id: string;
  user_id: string | null;
  display_name: string;
  phone: string | null;
  email: string | null;
  gender: PlayerGender | null;
  birth_year: string | number | null;
  self_level: string | number | null;
  confirmed_level: string | number | null;
  created_at: Date | string;
};

function num(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapPlayer(row: PlayerRow): Player {
  const createdAt =
    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  return {
    id: row.id,
    clubId: row.club_id,
    userId: row.user_id,
    displayName: row.display_name,
    phone: row.phone,
    email: row.email,
    gender: row.gender === "male" || row.gender === "female" ? row.gender : null,
    birthYear: num(row.birth_year),
    selfLevel: num(row.self_level),
    confirmedLevel: num(row.confirmed_level),
    createdAt,
  };
}

const PLAYER_COLUMNS = `id, club_id, user_id, display_name, phone, email, gender, birth_year, self_level, confirmed_level, created_at`;

export type ResolvedPlayer = {
  id: string;
  displayName: string;
};

export async function resolvePlayer(
  clubId: string,
  input: { playerId?: string; name: string },
): Promise<ResolvedPlayer> {
  const name = input.name.trim();
  if (input.playerId) {
    const existing = await query<{ id: string; display_name: string }>(
      "SELECT id, display_name FROM players WHERE id = $1 AND club_id = $2",
      [input.playerId, clubId],
    );
    const row = existing.rows[0];
    if (row) {
      return { id: row.id, displayName: row.display_name };
    }
  }

  const match = await query<{ id: string; display_name: string }>(
    `SELECT id, display_name FROM players
     WHERE club_id = $1 AND lower(display_name) = lower($2)
     ORDER BY created_at
     LIMIT 1`,
    [clubId, name],
  );
  const found = match.rows[0];
  if (found) {
    return { id: found.id, displayName: found.display_name };
  }

  const created = await query<{ id: string; display_name: string }>(
    `INSERT INTO players (club_id, display_name)
     VALUES ($1, $2)
     RETURNING id, display_name`,
    [clubId, name],
  );
  const row = created.rows[0];
  if (!row) {
    throw new Error("Failed to create player");
  }
  return { id: row.id, displayName: row.display_name };
}

export async function searchPlayers(clubId: string, q: string): Promise<Player[]> {
  const term = q.trim();
  const result = await query<PlayerRow>(
    term.length === 0
      ? `SELECT ${PLAYER_COLUMNS} FROM players WHERE club_id = $1
         ORDER BY display_name LIMIT 80`
      : `SELECT ${PLAYER_COLUMNS} FROM players
         WHERE club_id = $1 AND display_name ILIKE $2
         ORDER BY display_name LIMIT 80`,
    term.length === 0 ? [clubId] : [clubId, `%${term}%`],
  );
  return result.rows.map(mapPlayer);
}

export async function getPlayer(clubId: string, playerId: string): Promise<Player | undefined> {
  const result = await query<PlayerRow>(
    `SELECT ${PLAYER_COLUMNS} FROM players WHERE club_id = $1 AND id = $2`,
    [clubId, playerId],
  );
  const row = result.rows[0];
  return row ? mapPlayer(row) : undefined;
}

export async function getPlayerByUser(clubId: string, userId: string): Promise<Player | undefined> {
  const result = await query<PlayerRow>(
    `SELECT ${PLAYER_COLUMNS} FROM players WHERE club_id = $1 AND user_id = $2`,
    [clubId, userId],
  );
  const row = result.rows[0];
  return row ? mapPlayer(row) : undefined;
}

export async function ensurePlayerForUser(input: {
  clubId: string;
  userId: string;
  displayName: string;
  email: string;
}): Promise<Player> {
  const existing = await getPlayerByUser(input.clubId, input.userId);
  if (existing) {
    return existing;
  }

  const created = await query<PlayerRow>(
    `INSERT INTO players (club_id, user_id, display_name, email)
     VALUES ($1, $2, $3, $4)
     RETURNING ${PLAYER_COLUMNS}`,
    [input.clubId, input.userId, input.displayName, input.email],
  );
  const row = created.rows[0];
  if (!row) {
    throw new Error("Failed to create player for user");
  }
  return mapPlayer(row);
}

export async function findUnlinkedPlayerByEmail(
  clubId: string,
  email: string,
): Promise<Player | undefined> {
  const result = await query<PlayerRow>(
    `SELECT ${PLAYER_COLUMNS} FROM players
     WHERE club_id = $1 AND lower(email) = lower($2) AND user_id IS NULL
     ORDER BY created_at
     LIMIT 1`,
    [clubId, email],
  );
  const row = result.rows[0];
  return row ? mapPlayer(row) : undefined;
}

export async function linkPlayerToUser(
  clubId: string,
  playerId: string,
  userId: string,
): Promise<Player | undefined> {
  const result = await query<PlayerRow>(
    `UPDATE players
     SET user_id = $3
     WHERE club_id = $1 AND id = $2 AND user_id IS NULL
     RETURNING ${PLAYER_COLUMNS}`,
    [clubId, playerId, userId],
  );
  const row = result.rows[0];
  return row ? mapPlayer(row) : undefined;
}

export async function createPlayer(input: {
  clubId: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  gender: PlayerGender | null;
  birthYear: number | null;
  selfLevel: number | null;
  userId?: string | null;
}): Promise<Player> {
  const created = await query<PlayerRow>(
    `INSERT INTO players (club_id, user_id, display_name, phone, email, gender, birth_year, self_level)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING ${PLAYER_COLUMNS}`,
    [
      input.clubId,
      input.userId ?? null,
      input.displayName,
      input.phone,
      input.email,
      input.gender,
      input.birthYear,
      input.selfLevel,
    ],
  );
  const row = created.rows[0];
  if (!row) {
    throw new Error("Failed to create player");
  }
  return mapPlayer(row);
}

export async function updatePlayer(
  clubId: string,
  playerId: string,
  patch: {
    displayName?: string;
    phone?: string | null;
    email?: string | null;
    gender?: PlayerGender | null;
    birthYear?: number | null;
    selfLevel?: number | null;
    confirmedLevel?: number | null;
  },
): Promise<Player | undefined> {
  const current = await getPlayer(clubId, playerId);
  if (!current) {
    return undefined;
  }
  const next = {
    displayName: patch.displayName ?? current.displayName,
    phone: patch.phone === undefined ? current.phone : patch.phone,
    email: patch.email === undefined ? current.email : patch.email,
    gender: patch.gender === undefined ? current.gender : patch.gender,
    birthYear: patch.birthYear === undefined ? current.birthYear : patch.birthYear,
    selfLevel: patch.selfLevel === undefined ? current.selfLevel : patch.selfLevel,
    confirmedLevel:
      patch.confirmedLevel === undefined ? current.confirmedLevel : patch.confirmedLevel,
  };
  const result = await query<PlayerRow>(
    `UPDATE players
     SET display_name = $3, phone = $4, email = $5, gender = $6, birth_year = $7,
         self_level = $8, confirmed_level = $9
     WHERE club_id = $1 AND id = $2
     RETURNING ${PLAYER_COLUMNS}`,
    [
      clubId,
      playerId,
      next.displayName,
      next.phone,
      next.email,
      next.gender,
      next.birthYear,
      next.selfLevel,
      next.confirmedLevel,
    ],
  );
  const row = result.rows[0];
  return row ? mapPlayer(row) : undefined;
}

const ERASED_LABEL = "—";

export async function erasePlayer(clubId: string, player: Player): Promise<void> {
  await query(
    `UPDATE booking_spots
     SET guest_name = $3, player_id = NULL
     WHERE club_id = $1 AND player_id = $2`,
    [clubId, player.id, ERASED_LABEL],
  );
  if (player.userId) {
    await query(`UPDATE booking_spots SET added_by = NULL WHERE club_id = $1 AND added_by = $2`, [
      clubId,
      player.userId,
    ]);
    await query(`UPDATE bookings SET created_by = NULL WHERE club_id = $1 AND created_by = $2`, [
      clubId,
      player.userId,
    ]);
  }
  await query(
    `UPDATE bookings SET pairing = NULL
     WHERE club_id = $1 AND pairing IS NOT NULL AND pairing::text LIKE $2`,
    [clubId, `%${player.id}%`],
  );
  await query(`DELETE FROM waitlist_entries WHERE club_id = $1 AND guest_name = $2`, [
    clubId,
    player.displayName,
  ]);
  await query(`DELETE FROM players WHERE club_id = $1 AND id = $2`, [clubId, player.id]);
  if (player.userId) {
    await query(`DELETE FROM sessions WHERE user_id = $1 AND club_id = $2`, [player.userId, clubId]);
    await query(`DELETE FROM users WHERE id = $1 AND club_id = $2`, [player.userId, clubId]);
  }
}
