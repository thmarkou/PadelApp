import type {
  Scoring,
  Tournament,
  TournamentCategory,
  TournamentFormat,
  TournamentGenderRule,
  TournamentStatus,
} from "@padelapp/shared";
import { query } from "./pool.js";

type TournamentRow = {
  id: string;
  club_id: string;
  name: string;
  starts_on: string;
  format: TournamentFormat;
  scoring: Scoring | string;
  status: TournamentStatus;
  created_at: Date | string;
};

type CategoryRow = {
  id: string;
  tournament_id: string;
  name: string;
  gender: TournamentGenderRule;
  min_age: number | null;
  max_age: number | null;
  min_level: string | number | null;
  max_level: string | number | null;
  sort_order: number;
  entry_count?: string | number;
};

function num(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseScoring(value: Scoring | string): Scoring {
  return typeof value === "string" ? (JSON.parse(value) as Scoring) : value;
}

function dateOnly(value: string): string {
  return value.slice(0, 10);
}

export function mapTournament(row: TournamentRow): Tournament {
  const created =
    row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at);
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    startsOn: dateOnly(String(row.starts_on)),
    format: row.format,
    scoring: parseScoring(row.scoring),
    status: row.status,
    createdAt: created,
  };
}

export function mapCategory(row: CategoryRow): TournamentCategory {
  return {
    id: row.id,
    tournamentId: row.tournament_id,
    name: row.name,
    gender: row.gender,
    minAge: row.min_age,
    maxAge: row.max_age,
    minLevel: num(row.min_level),
    maxLevel: num(row.max_level),
    sortOrder: row.sort_order,
    entryCount: row.entry_count === undefined ? undefined : Number(row.entry_count),
  };
}

export async function listTournaments(clubId: string): Promise<Tournament[]> {
  const result = await query<TournamentRow>(
    `SELECT id, club_id, name, starts_on::text, format, scoring, status, created_at
     FROM tournaments WHERE club_id = $1
     ORDER BY starts_on DESC, created_at DESC`,
    [clubId],
  );
  return result.rows.map(mapTournament);
}

export async function getTournament(clubId: string, id: string): Promise<Tournament | undefined> {
  const result = await query<TournamentRow>(
    `SELECT id, club_id, name, starts_on::text, format, scoring, status, created_at
     FROM tournaments WHERE club_id = $1 AND id = $2`,
    [clubId, id],
  );
  const row = result.rows[0];
  return row ? mapTournament(row) : undefined;
}

export async function createTournament(input: {
  clubId: string;
  name: string;
  startsOn: string;
  format: TournamentFormat;
  scoring: Scoring;
  createdBy: string | null;
}): Promise<Tournament> {
  const result = await query<TournamentRow>(
    `INSERT INTO tournaments (club_id, name, starts_on, format, scoring, status, created_by)
     VALUES ($1, $2, $3::date, $4, $5::jsonb, 'draft', $6)
     RETURNING id, club_id, name, starts_on::text, format, scoring, status, created_at`,
    [input.clubId, input.name, input.startsOn, input.format, JSON.stringify(input.scoring), input.createdBy],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create tournament");
  }
  return mapTournament(row);
}

export async function setTournamentStatus(
  clubId: string,
  id: string,
  status: TournamentStatus,
): Promise<Tournament | undefined> {
  const result = await query<TournamentRow>(
    `UPDATE tournaments SET status = $3 WHERE club_id = $1 AND id = $2
     RETURNING id, club_id, name, starts_on::text, format, scoring, status, created_at`,
    [clubId, id, status],
  );
  const row = result.rows[0];
  return row ? mapTournament(row) : undefined;
}

export async function listCategories(clubId: string, tournamentId: string): Promise<TournamentCategory[]> {
  const result = await query<CategoryRow>(
    `SELECT c.id, c.tournament_id, c.name, c.gender, c.min_age, c.max_age, c.min_level, c.max_level, c.sort_order,
            (SELECT count(*) FROM tournament_entries e WHERE e.category_id = c.id) AS entry_count
     FROM tournament_categories c
     WHERE c.club_id = $1 AND c.tournament_id = $2
     ORDER BY c.sort_order, c.name`,
    [clubId, tournamentId],
  );
  return result.rows.map(mapCategory);
}

export async function getCategory(clubId: string, id: string): Promise<TournamentCategory | undefined> {
  const result = await query<CategoryRow>(
    `SELECT c.id, c.tournament_id, c.name, c.gender, c.min_age, c.max_age, c.min_level, c.max_level, c.sort_order,
            (SELECT count(*) FROM tournament_entries e WHERE e.category_id = c.id) AS entry_count
     FROM tournament_categories c
     WHERE c.club_id = $1 AND c.id = $2`,
    [clubId, id],
  );
  const row = result.rows[0];
  return row ? mapCategory(row) : undefined;
}

export async function createCategory(
  clubId: string,
  tournamentId: string,
  input: {
    name: string;
    gender: TournamentGenderRule;
    minAge: number | null;
    maxAge: number | null;
    minLevel: number | null;
    maxLevel: number | null;
    sortOrder: number;
  },
): Promise<TournamentCategory> {
  const result = await query<CategoryRow>(
    `INSERT INTO tournament_categories
       (tournament_id, club_id, name, gender, min_age, max_age, min_level, max_level, sort_order)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     RETURNING id, tournament_id, name, gender, min_age, max_age, min_level, max_level, sort_order`,
    [
      tournamentId,
      clubId,
      input.name,
      input.gender,
      input.minAge,
      input.maxAge,
      input.minLevel,
      input.maxLevel,
      input.sortOrder,
    ],
  );
  const row = result.rows[0];
  if (!row) {
    throw new Error("Failed to create category");
  }
  return mapCategory({ ...row, entry_count: 0 });
}
