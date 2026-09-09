import {
  eligibleForCategory,
  pairForCategory,
  PairingError,
  parseClubSettings,
  playingLevel,
  standingsFromMatches,
  tournamentGenderRules,
  tournamentStatuses,
} from "@padelapp/shared";
import type { AppRole, TournamentStatus } from "@padelapp/shared";
import { Router } from "express";
import { z } from "zod";
import { getPlayer, getPlayerByUser } from "../db/players.js";
import { query } from "../db/pool.js";
import {
  createCategory,
  createTournament,
  getCategory,
  getTournament,
  listCategories,
  listTournaments,
  setTournamentStatus,
} from "../db/tournaments.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { requireAuth } from "../http/auth.js";
import { HttpError } from "../http/errors.js";

export const tournamentsRouter = Router();

function canManage(role: AppRole): boolean {
  return role === "owner" || role === "reception";
}

function canScore(role: AppRole): boolean {
  return role === "owner" || role === "reception" || role === "coach";
}

async function clubSettings(clubId: string) {
  const row = await query<{ settings: unknown }>(
    "SELECT settings FROM club_settings WHERE club_id = $1",
    [clubId],
  );
  return parseClubSettings(row.rows[0]?.settings);
}

const categoryBody = z.object({
  name: z.string().min(1),
  gender: z.enum(tournamentGenderRules),
  minAge: z.number().int().min(4).max(80).nullable().optional(),
  maxAge: z.number().int().min(4).max(80).nullable().optional(),
  minLevel: z.number().nullable().optional(),
  maxLevel: z.number().nullable().optional(),
});

tournamentsRouter.get(
  "/tournaments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const tournaments = await listTournaments(auth.clubId);
    const withCats = await Promise.all(
      tournaments.map(async (tournament) => ({
        ...tournament,
        categories: await listCategories(auth.clubId, tournament.id),
      })),
    );
    res.json({ tournaments: withCats });
  }),
);

tournamentsRouter.post(
  "/tournaments",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth || !canManage(auth.role)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const body = z
      .object({
        name: z.string().min(1),
        startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        presetId: z.string().min(1),
        categories: z.array(categoryBody).min(1),
      })
      .parse(req.body);
    const settings = await clubSettings(auth.clubId);
    const preset = settings.tournamentPresets.find((item) => item.id === body.presetId);
    if (!preset) {
      throw new HttpError(400, "Δεν βρέθηκε το preset", "preset_not_found");
    }
    const tournament = await createTournament({
      clubId: auth.clubId,
      name: body.name,
      startsOn: body.startsOn,
      format: preset.format,
      scoring: preset.scoring,
      createdBy: auth.userId,
    });
    const categories = [];
    for (const [index, item] of body.categories.entries()) {
      categories.push(
        await createCategory(auth.clubId, tournament.id, {
          name: item.name,
          gender: item.gender,
          minAge: item.minAge ?? null,
          maxAge: item.maxAge ?? null,
          minLevel: item.minLevel ?? null,
          maxLevel: item.maxLevel ?? null,
          sortOrder: index,
        }),
      );
    }
    res.status(201).json({ tournament, categories });
  }),
);

tournamentsRouter.get(
  "/tournaments/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const tournament = await getTournament(auth.clubId, req.params.id);
    if (!tournament) {
      throw new HttpError(404, "Δεν βρέθηκε το τουρνουά", "tournament_not_found");
    }
    res.json({
      tournament,
      categories: await listCategories(auth.clubId, tournament.id),
    });
  }),
);

tournamentsRouter.post(
  "/tournaments/:id/status",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth || !canManage(auth.role)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const status = z.enum(tournamentStatuses).parse(req.body.status);
    const tournament = await setTournamentStatus(auth.clubId, req.params.id, status as TournamentStatus);
    if (!tournament) {
      throw new HttpError(404, "Δεν βρέθηκε το τουρνουά", "tournament_not_found");
    }
    res.json({ tournament });
  }),
);

tournamentsRouter.get(
  "/categories/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const category = await getCategory(auth.clubId, req.params.id);
    if (!category) {
      throw new HttpError(404, "Δεν βρέθηκε η κατηγορία", "category_not_found");
    }
    const tournament = await getTournament(auth.clubId, category.tournamentId);
    const entries = await query<{
      id: string;
      player_id: string;
      display_name: string;
      gender: "male" | "female" | null;
      birth_year: number | null;
      self_level: string | number | null;
      confirmed_level: string | number | null;
    }>(
      `SELECT e.id, e.player_id, p.display_name, p.gender, p.birth_year, p.self_level, p.confirmed_level
       FROM tournament_entries e
       JOIN players p ON p.id = e.player_id
       WHERE e.category_id = $1
       ORDER BY p.display_name`,
      [category.id],
    );
    const rounds = await query<{ id: string; number: number }>(
      `SELECT id, number FROM tournament_rounds WHERE category_id = $1 ORDER BY number`,
      [category.id],
    );
    const matches = await query<{
      id: string;
      round_id: string;
      court_index: number;
      a1: string | null;
      a2: string | null;
      b1: string | null;
      b2: string | null;
      score_a: number | null;
      score_b: number | null;
      a1n: string | null;
      a2n: string | null;
      b1n: string | null;
      b2n: string | null;
    }>(
      `SELECT m.id, m.round_id, m.court_index, m.a1, m.a2, m.b1, m.b2, m.score_a, m.score_b,
              pa1.display_name AS a1n, pa2.display_name AS a2n, pb1.display_name AS b1n, pb2.display_name AS b2n
       FROM tournament_matches m
       LEFT JOIN players pa1 ON pa1.id = m.a1
       LEFT JOIN players pa2 ON pa2.id = m.a2
       LEFT JOIN players pb1 ON pb1.id = m.b1
       LEFT JOIN players pb2 ON pb2.id = m.b2
       WHERE m.category_id = $1
       ORDER BY m.court_index`,
      [category.id],
    );
    const scored = matches.rows
      .filter((row) => row.a1 && row.a2 && row.b1 && row.b2)
      .map((row) => ({
        pairA: [row.a1 as string, row.a2 as string] as [string, string],
        pairB: [row.b1 as string, row.b2 as string] as [string, string],
        scoreA: row.score_a,
        scoreB: row.score_b,
      }));
    const standings = standingsFromMatches(
      entries.rows.map((row) => ({ id: row.player_id, name: row.display_name })),
      scored,
    );
    res.json({
      tournament,
      category,
      entries: entries.rows.map((row) => ({
        id: row.id,
        playerId: row.player_id,
        displayName: row.display_name,
        gender: row.gender,
        birthYear: row.birth_year,
        level: playingLevel(
          row.self_level === null ? null : Number(row.self_level),
          row.confirmed_level === null ? null : Number(row.confirmed_level),
        ),
      })),
      standings,
      rounds: rounds.rows.map((round) => ({
        id: round.id,
        number: round.number,
        matches: matches.rows
          .filter((match) => match.round_id === round.id)
          .map((match) => ({
            id: match.id,
            courtIndex: match.court_index,
            pairA: [match.a1n, match.a2n].filter(Boolean),
            pairB: [match.b1n, match.b2n].filter(Boolean),
            playerIds: { a1: match.a1, a2: match.a2, b1: match.b1, b2: match.b2 },
            scoreA: match.score_a,
            scoreB: match.score_b,
          })),
      })),
    });
  }),
);

tournamentsRouter.post(
  "/categories/:id/entries",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const category = await getCategory(auth.clubId, req.params.id);
    if (!category) {
      throw new HttpError(404, "Δεν βρέθηκε η κατηγορία", "category_not_found");
    }
    const tournament = await getTournament(auth.clubId, category.tournamentId);
    if (!tournament || tournament.status === "closed") {
      throw new HttpError(400, "Το τουρνουά είναι κλειστό", "tournament_closed");
    }
    if (tournament.status === "draft" && !canManage(auth.role)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const requestedId = z.string().uuid().optional().parse(req.body.playerId);
    const me = await getPlayerByUser(auth.clubId, auth.userId);
    const playerId = canManage(auth.role) || canScore(auth.role) ? (requestedId ?? me?.id) : me?.id;
    if (!playerId) {
      throw new HttpError(400, "Δεν βρέθηκε ο παίκτης", "player_not_found");
    }
    const player = await getPlayer(auth.clubId, playerId);
    if (!player) {
      throw new HttpError(404, "Δεν βρέθηκε ο παίκτης", "player_not_found");
    }
    if (!canManage(auth.role) && player.userId !== auth.userId) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const check = eligibleForCategory(player, category);
    if (!check.ok) {
      throw new HttpError(403, "Ο παίκτης δεν ανήκει σε αυτή την κατηγορία", check.reason);
    }
    await query(
      `INSERT INTO tournament_entries (category_id, club_id, player_id)
       VALUES ($1, $2, $3)
       ON CONFLICT (category_id, player_id) DO NOTHING`,
      [category.id, auth.clubId, player.id],
    );
    if (tournament.status === "draft") {
      await setTournamentStatus(auth.clubId, tournament.id, "open");
    }
    res.status(201).json({ ok: true });
  }),
);

tournamentsRouter.delete(
  "/entries/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const entry = await query<{ id: string; player_id: string }>(
      `SELECT e.id, e.player_id FROM tournament_entries e
       JOIN tournament_categories c ON c.id = e.category_id
       JOIN tournaments t ON t.id = c.tournament_id
       WHERE e.id = $1 AND e.club_id = $2 AND t.status <> 'closed'`,
      [req.params.id, auth.clubId],
    );
    const row = entry.rows[0];
    if (!row) {
      throw new HttpError(404, "Δεν βρέθηκε η εγγραφή", "entry_not_found");
    }
    const me = await getPlayerByUser(auth.clubId, auth.userId);
    if (!canManage(auth.role) && me?.id !== row.player_id) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    await query(`DELETE FROM tournament_entries WHERE id = $1 AND club_id = $2`, [
      row.id,
      auth.clubId,
    ]);
    res.json({ ok: true });
  }),
);

tournamentsRouter.post(
  "/categories/:id/rounds",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth || !canScore(auth.role)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const category = await getCategory(auth.clubId, req.params.id);
    if (!category) {
      throw new HttpError(404, "Δεν βρέθηκε η κατηγορία", "category_not_found");
    }
    const tournament = await getTournament(auth.clubId, category.tournamentId);
    if (!tournament || tournament.status === "closed") {
      throw new HttpError(400, "Το τουρνουά είναι κλειστό", "tournament_closed");
    }
    const settings = await clubSettings(auth.clubId);
    const entries = await query<{
      player_id: string;
      display_name: string;
      gender: "male" | "female" | null;
      self_level: string | number | null;
      confirmed_level: string | number | null;
    }>(
      `SELECT e.player_id, p.display_name, p.gender, p.self_level, p.confirmed_level
       FROM tournament_entries e JOIN players p ON p.id = e.player_id
       WHERE e.category_id = $1`,
      [category.id],
    );
    const last = await query<{ number: number }>(
      `SELECT number FROM tournament_rounds WHERE category_id = $1 ORDER BY number DESC LIMIT 1`,
      [category.id],
    );
    const nextNumber = (last.rows[0]?.number ?? 0) + 1;
    const existingMatches = await query<{
      a1: string | null;
      a2: string | null;
      b1: string | null;
      b2: string | null;
      score_a: number | null;
      score_b: number | null;
    }>(
      `SELECT a1, a2, b1, b2, score_a, score_b FROM tournament_matches WHERE category_id = $1`,
      [category.id],
    );
    const table = standingsFromMatches(
      entries.rows.map((row) => ({ id: row.player_id, name: row.display_name })),
      existingMatches.rows
        .filter((row) => row.a1 && row.a2 && row.b1 && row.b2)
        .map((row) => ({
          pairA: [row.a1 as string, row.a2 as string] as [string, string],
          pairB: [row.b1 as string, row.b2 as string] as [string, string],
          scoreA: row.score_a,
          scoreB: row.score_b,
        })),
    );
    const points = new Map(table.map((row) => [row.playerId, row.points]));
    const algorithm = tournament.format === "mexicano" ? "mexicano" : settings.pairing.algorithm;
    try {
      const pairing = pairForCategory(
        entries.rows.map((row) => ({
          id: row.player_id,
          name: row.display_name,
          gender: row.gender,
          level: playingLevel(
            row.self_level === null ? null : Number(row.self_level),
            row.confirmed_level === null ? null : Number(row.confirmed_level),
          ),
          standingPoints: points.get(row.player_id) ?? 0,
        })),
        { algorithm, mixedDoubles: category.gender === "mixed_doubles" },
      );
      const round = await query<{ id: string }>(
        `INSERT INTO tournament_rounds (category_id, club_id, number) VALUES ($1, $2, $3) RETURNING id`,
        [category.id, auth.clubId, nextNumber],
      );
      const roundId = round.rows[0]?.id;
      if (!roundId) {
        throw new HttpError(500, "Αποτυχία γύρου", "round_failed");
      }
      for (const match of pairing.matches) {
        await query(
          `INSERT INTO tournament_matches
             (round_id, category_id, club_id, court_index, a1, a2, b1, b2)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            roundId,
            category.id,
            auth.clubId,
            match.courtIndex,
            match.pairA.playerIds[0],
            match.pairA.playerIds[1],
            match.pairB.playerIds[0],
            match.pairB.playerIds[1],
          ],
        );
      }
      if (tournament.status !== "running") {
        await setTournamentStatus(auth.clubId, tournament.id, "running");
      }
      res.status(201).json({ ok: true, leftover: pairing.leftover, round: nextNumber });
    } catch (error) {
      if (error instanceof PairingError) {
        throw new HttpError(400, error.message, error.code);
      }
      throw error;
    }
  }),
);

tournamentsRouter.post(
  "/matches/:id/score",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth || !canScore(auth.role)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const body = z.object({ scoreA: z.number().int().min(0), scoreB: z.number().int().min(0) }).parse(req.body);
    const updated = await query<{ id: string }>(
      `UPDATE tournament_matches SET score_a = $3, score_b = $4
       WHERE id = $1 AND club_id = $2
       RETURNING id`,
      [req.params.id, auth.clubId, body.scoreA, body.scoreB],
    );
    if (!updated.rows[0]) {
      throw new HttpError(404, "Δεν βρέθηκε το ματς", "match_not_found");
    }
    res.json({ ok: true });
  }),
);
