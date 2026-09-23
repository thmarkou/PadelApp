import {
  eligibleForCategory,
  formBracketTeams,
  fixtureKey,
  groupQualifiers,
  GroupsError,
  groupStageComplete,
  groupStandings,
  KnockoutError,
  knockoutFromQualifiers,
  KotcError,
  nextGroupMatchday,
  nextKotcRound,
  replacePlayerInKotc,
  seedKotcCourts,
  splitIntoGroups,
  splitKotcBench,
  nextKnockoutRound,
  nextLevelsAfterMatch,
  playerAge,
  pairForCategory,
  pairPlayers,
  PairingError,
  seedFirstRound,
  swapIncomingForPlayer,
  expandPlayDates,
  isPlayTime,
  parseClubSettings,
  parseAvailable,
  playingLevel,
  standingsFromMatches,
  tournamentGenderRules,
  tournamentStatuses,
  winningTeam,
} from "@padelapp/shared";
import type {
  AppRole,
  BracketTeam,
  CategoryEligibility,
  GroupAssignment,
  Player,
  TournamentCategory,
  TournamentStatus,
} from "@padelapp/shared";
import { Router } from "express";
import { z } from "zod";
import { getPlayer, getPlayerByUser, updatePlayer } from "../db/players.js";
import { query } from "../db/pool.js";
import {
  createCategory,
  createTournament,
  getCategory,
  getTournament,
  insertPlaySlots,
  listCategories,
  listPlaySlots,
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

function entryRejected(player: Player, category: TournamentCategory, reason: CategoryEligibility["reason"]): string {
  const need =
    category.gender === "men" ? "μόνο άνδρες" : category.gender === "women" ? "μόνο γυναίκες" : "άνδρες και γυναίκες";
  const gender = player.gender === "male" ? "άνδρας" : player.gender === "female" ? "γυναίκα" : "χωρίς φύλο";
  const age = playerAge(player.birthYear);
  const level = playingLevel(player.selfLevel, player.confirmedLevel);
  const ages = `${category.minAge ?? "–"}–${category.maxAge ?? "–"}`;
  const levels = `${category.minLevel ?? "–"}–${category.maxLevel ?? "–"}`;
  if (reason === "gender_missing") {
    return `${player.displayName}: λείπει φύλο στο προφίλ. Η κατηγορία «${category.name}» δέχεται ${need}.`;
  }
  if (reason === "gender_mismatch") {
    return `${player.displayName} είναι ${gender}. Η κατηγορία «${category.name}» δέχεται ${need}.`;
  }
  if (reason === "age_missing") {
    return `${player.displayName}: λείπει έτος γέννησης. Η κατηγορία «${category.name}» δέχεται ηλικίες ${ages}.`;
  }
  if (reason === "age_mismatch") {
    return `${player.displayName} είναι ${age ?? "—"} ετών. Η κατηγορία «${category.name}» δέχεται ηλικίες ${ages}.`;
  }
  if (reason === "level_missing") {
    return `${player.displayName}: λείπει επίπεδο. Η κατηγορία «${category.name}» δέχεται επίπεδα ${levels}.`;
  }
  if (reason === "level_mismatch") {
    return `${player.displayName} έχει επίπεδο ${level ?? "—"}. Η κατηγορία «${category.name}» δέχεται επίπεδα ${levels}.`;
  }
  return `${player.displayName} δεν μπαίνει στην κατηγορία «${category.name}».`;
}

function bracketTeam(
  ids: [string, string],
  players: Array<{ id: string; name: string }>,
): BracketTeam {
  return {
    playerIds: ids,
    names: [
      players.find((player) => player.id === ids[0])?.name ?? "",
      players.find((player) => player.id === ids[1])?.name ?? "",
    ],
  };
}

function knockoutMessage(error: KnockoutError): string {
  if (error.code === "knockout_odd_player") {
    return error.message;
  }
  if (error.code === "knockout_complete") {
    return "Το ταμπλό έχει νικητή. Δεν ανοίγει άλλος γύρος.";
  }
  if (error.code === "knockout_draw") {
    return "Στο knockout δεν γίνεται ισοπαλία. Άλλαξε το σκορ.";
  }
  return "Το knockout θέλει τουλάχιστον δύο ζευγάρια (4 παίκτες).";
}

function knockoutStatus(code: KnockoutError["code"]): number {
  return code === "knockout_complete" ? 409 : 400;
}

function groupsMessage(error: GroupsError): string {
  if (error.code === "groups_odd_player") {
    return error.message;
  }
  return "Οι όμιλοι θέλουν τουλάχιστον τρία ζευγάρια (6 παίκτες).";
}

function kotcMessage(error: KotcError): string {
  if (error.code === "kotc_draw") {
    return "Στο King of the Court δεν γίνεται ισοπαλία. Άλλαξε το σκορ.";
  }
  if (error.code === "kotc_unknown_player") {
    return "Αυτός ο παίκτης δεν μένει στο γήπεδο αυτόν τον γύρο. Διάλεξε κάποιον που παίζει.";
  }
  if (error.code === "kotc_incomplete") {
    return "Βάλε σκορ σε όλα τα γήπεδα πριν ανοίξεις τον επόμενο γύρο.";
  }
  if (error.message.startsWith("Το King")) {
    return error.message;
  }
  return "Το King of the Court θέλει τουλάχιστον δύο ζευγάρια (4 παίκτες).";
}

async function categoryHasScoredMatch(clubId: string, categoryId: string): Promise<boolean> {
  const result = await query<{ n: string }>(
    `SELECT count(*)::text AS n FROM tournament_matches
     WHERE club_id = $1 AND category_id = $2
       AND score_a IS NOT NULL AND score_b IS NOT NULL`,
    [clubId, categoryId],
  );
  return Number(result.rows[0]?.n ?? 0) > 0;
}

async function dropUnscoredRounds(clubId: string, categoryId: string): Promise<void> {
  if (await categoryHasScoredMatch(clubId, categoryId)) {
    return;
  }
  await query(`DELETE FROM tournament_rounds WHERE club_id = $1 AND category_id = $2`, [
    clubId,
    categoryId,
  ]);
  await query(`DELETE FROM tournament_group_teams WHERE club_id = $1 AND category_id = $2`, [
    clubId,
    categoryId,
  ]);
}

async function dropTrailingUnscoredRounds(clubId: string, categoryId: string): Promise<void> {
  await query(
    `DELETE FROM tournament_rounds
     WHERE club_id = $1 AND category_id = $2
       AND number > (
         SELECT COALESCE(MAX(r.number), 0) + 1
         FROM tournament_rounds r
         JOIN tournament_matches m ON m.round_id = r.id
         WHERE r.club_id = $1 AND r.category_id = $2
           AND m.score_a IS NOT NULL AND m.score_b IS NOT NULL
       )`,
    [clubId, categoryId],
  );
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
        startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        playSlots: z
          .array(
            z.object({
              playDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
              start: z.string(),
              end: z.string(),
            }),
          )
          .optional(),
        playDates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
        presetId: z.string().min(1),
        categories: z.array(categoryBody).min(1),
      })
      .parse(req.body);
    const settings = await clubSettings(auth.clubId);
    const preset = settings.tournamentPresets.find((item) => item.id === body.presetId);
    if (!preset) {
      throw new HttpError(400, "Δεν βρέθηκε το preset", "preset_not_found");
    }
    const drafts =
      body.playSlots && body.playSlots.length > 0
        ? body.playSlots
        : expandPlayDates(body.playDates ?? (body.startsOn ? [body.startsOn] : []));
    if (drafts.length === 0 || drafts.some((slot) => !isPlayTime(slot.start) || !isPlayTime(slot.end))) {
      throw new HttpError(400, "Χρειάζεται τουλάχιστον μία ημέρα αγώνα με έγκυρες ώρες", "play_slots_required");
    }
    const startsOn = [...drafts.map((slot) => slot.playDate)].sort()[0] ?? body.startsOn;
    if (!startsOn) {
      throw new HttpError(400, "Χρειάζεται τουλάχιστον μία ημέρα αγώνα με έγκυρες ώρες", "play_slots_required");
    }
    const tournament = await createTournament({
      clubId: auth.clubId,
      name: body.name,
      startsOn,
      format: preset.format,
      scoring: preset.scoring,
      createdBy: auth.userId,
    });
    const playSlots = await insertPlaySlots(auth.clubId, tournament.id, drafts);
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
    res.status(201).json({ tournament: { ...tournament, playSlots }, categories });
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
      tournament: { ...tournament, playSlots: await listPlaySlots(auth.clubId, tournament.id) },
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
    await dropTrailingUnscoredRounds(auth.clubId, category.id);
    const playSlots = tournament ? await listPlaySlots(auth.clubId, tournament.id) : [];
    const entries = await query<{
      id: string;
      player_id: string;
      available_all: boolean;
      display_name: string;
      gender: "male" | "female" | null;
      birth_year: number | null;
      self_level: string | number | null;
      confirmed_level: string | number | null;
    }>(
      `SELECT e.id, e.player_id, e.available_all, p.display_name, p.gender, p.birth_year, p.self_level, p.confirmed_level
       FROM tournament_entries e
       JOIN players p ON p.id = e.player_id AND p.club_id = e.club_id
       WHERE e.category_id = $1 AND e.club_id = $2
       ORDER BY p.display_name`,
      [category.id, auth.clubId],
    );
    const blocks = await query<{ entry_id: string; slot_id: string }>(
      `SELECT b.entry_id, b.slot_id
       FROM tournament_entry_available b
       JOIN tournament_entries e ON e.id = b.entry_id
       WHERE e.category_id = $1 AND e.club_id = $2`,
      [category.id, auth.clubId],
    );
    const pickedByEntry = new Map<string, string[]>();
    for (const row of blocks.rows) {
      const current = pickedByEntry.get(row.entry_id) ?? [];
      current.push(row.slot_id);
      pickedByEntry.set(row.entry_id, current);
    }
    const rounds = await query<{ id: string; number: number }>(
      `SELECT id, number FROM tournament_rounds WHERE category_id = $1 AND club_id = $2 ORDER BY number`,
      [category.id, auth.clubId],
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
      closed: boolean;
      stage: string;
      group_index: number | null;
      a1n: string | null;
      a2n: string | null;
      b1n: string | null;
      b2n: string | null;
    }>(
      `SELECT m.id, m.round_id, m.court_index, m.a1, m.a2, m.b1, m.b2, m.score_a, m.score_b, m.closed,
              m.stage, m.group_index,
              pa1.display_name AS a1n, pa2.display_name AS a2n, pb1.display_name AS b1n, pb2.display_name AS b2n
       FROM tournament_matches m
       LEFT JOIN players pa1 ON pa1.id = m.a1
       LEFT JOIN players pa2 ON pa2.id = m.a2
       LEFT JOIN players pb1 ON pb1.id = m.b1
       LEFT JOIN players pb2 ON pb2.id = m.b2
       WHERE m.category_id = $1 AND m.club_id = $2
       ORDER BY m.court_index`,
      [category.id, auth.clubId],
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
    const groupRows = await query<{
      group_index: number;
      seed: number;
      a1: string;
      a2: string;
      a1n: string;
      a2n: string;
    }>(
      `SELECT g.group_index, g.seed, g.a1, g.a2, pa.display_name AS a1n, pb.display_name AS a2n
       FROM tournament_group_teams g
       JOIN players pa ON pa.id = g.a1
       JOIN players pb ON pb.id = g.a2
       WHERE g.category_id = $1 AND g.club_id = $2
       ORDER BY g.group_index, g.seed`,
      [category.id, auth.clubId],
    );
    const groupIndexes = [...new Set(groupRows.rows.map((row) => row.group_index))];
    const groups = groupIndexes.map((index) => {
      const teams = groupRows.rows
        .filter((row) => row.group_index === index)
        .map((row) => ({
          playerIds: [row.a1, row.a2] as [string, string],
          names: [row.a1n, row.a2n] as [string, string],
        }));
      const table = groupStandings(
        teams,
        matches.rows
          .filter(
            (row) =>
              row.stage === "group" &&
              row.group_index === index &&
              row.a1 &&
              row.a2 &&
              row.b1 &&
              row.b2 &&
              row.score_a !== null &&
              row.score_b !== null,
          )
          .map((row) => ({
            pairA: {
              playerIds: [row.a1 as string, row.a2 as string] as [string, string],
              names: [row.a1n ?? "", row.a2n ?? ""] as [string, string],
            },
            pairB: {
              playerIds: [row.b1 as string, row.b2 as string] as [string, string],
              names: [row.b1n ?? "", row.b2n ?? ""] as [string, string],
            },
            scoreA: row.score_a as number,
            scoreB: row.score_b as number,
          })),
      );
      return {
        index,
        teams: teams.map((team) => ({ names: team.names, playerIds: team.playerIds })),
        standings: table.map((row) => ({
          names: row.team.names,
          wins: row.wins,
          played: row.played,
          diff: row.pointsFor - row.pointsAgainst,
        })),
      };
    });
    const assignments: GroupAssignment[] = groupIndexes.map((index) => ({
      groupIndex: index,
      teams: groupRows.rows
        .filter((row) => row.group_index === index)
        .map((row) => ({
          playerIds: [row.a1, row.a2] as [string, string],
          names: [row.a1n, row.a2n] as [string, string],
        })),
    }));
    const scoredGroupKeys = new Set(
      matches.rows
        .filter(
          (row) =>
            row.stage === "group" &&
            row.a1 &&
            row.a2 &&
            row.b1 &&
            row.b2 &&
            row.score_a !== null &&
            row.score_b !== null,
        )
        .map((row) =>
          fixtureKey(
            { playerIds: [row.a1 as string, row.a2 as string], names: ["", ""] },
            { playerIds: [row.b1 as string, row.b2 as string], names: ["", ""] },
          ),
        ),
    );
    res.json({
      tournament: tournament ? { ...tournament, playSlots } : tournament,
      category,
      playSlots,
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
        availableAll: row.available_all,
        availableSlotIds: pickedByEntry.get(row.id) ?? [],
      })),
      standings,
      groups,
      groupStageComplete: assignments.length > 0 && groupStageComplete(assignments, scoredGroupKeys),
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
            closed: match.closed,
            bye: !match.b1 || !match.b2,
            stage: match.stage,
            groupIndex: match.group_index,
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
    if (await categoryHasScoredMatch(auth.clubId, category.id)) {
      throw new HttpError(409, "Οι εγγραφές κλείδωσαν μόλις μπήκε σκορ", "entries_locked");
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
      throw new HttpError(403, entryRejected(player, category, check.reason), check.reason);
    }
    const playSlots = await listPlaySlots(auth.clubId, category.tournamentId);
    const availability = z
      .object({
        availableAll: z.boolean().optional(),
        availableSlotIds: z.array(z.string().uuid()).optional(),
      })
      .parse(req.body);
    const availableAll = availability.availableAll ?? true;
    const parsed = parseAvailable(availableAll, availability.availableSlotIds ?? []);
    if (playSlots.length > 0 && !parsed.ok) {
      throw new HttpError(
        400,
        parsed.reason === "too_many"
          ? "Μέχρι 8 ώρες που μπορείς"
          : "Διάλεξε όλες τις ώρες ή μέχρι 8 ώρες που μπορείς",
        parsed.reason,
      );
    }
    const allowed = new Set(playSlots.map((slot) => slot.id));
    if (parsed.ok && parsed.ids.some((id) => !allowed.has(id))) {
      throw new HttpError(400, "Άκυρο σλοτ διαθεσιμότητας", "slot_not_in_tournament");
    }
    const inserted = await query<{ id: string }>(
      `INSERT INTO tournament_entries (category_id, club_id, player_id, available_all)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (category_id, player_id) DO UPDATE SET available_all = EXCLUDED.available_all
       RETURNING id`,
      [category.id, auth.clubId, player.id, parsed.ok ? availableAll : true],
    );
    const entryId = inserted.rows[0]?.id;
    if (entryId) {
      await query(`DELETE FROM tournament_entry_available WHERE entry_id = $1`, [entryId]);
      if (parsed.ok && !availableAll) {
        for (const slotId of parsed.ids) {
          await query(`INSERT INTO tournament_entry_available (entry_id, slot_id) VALUES ($1, $2)`, [
            entryId,
            slotId,
          ]);
        }
      }
    }
    if (tournament.status === "draft") {
      await setTournamentStatus(auth.clubId, tournament.id, "open");
    }
    await dropUnscoredRounds(auth.clubId, category.id);
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
    const entry = await query<{ id: string; player_id: string; category_id: string }>(
      `SELECT e.id, e.player_id, e.category_id FROM tournament_entries e
       JOIN tournament_categories c ON c.id = e.category_id
       JOIN tournaments t ON t.id = c.tournament_id
       WHERE e.id = $1 AND e.club_id = $2 AND t.status <> 'closed'`,
      [req.params.id, auth.clubId],
    );
    const row = entry.rows[0];
    if (!row) {
      throw new HttpError(404, "Δεν βρέθηκε η εγγραφή", "entry_not_found");
    }
    if (await categoryHasScoredMatch(auth.clubId, row.category_id)) {
      throw new HttpError(409, "Οι εγγραφές κλείδωσαν μόλις μπήκε σκορ", "entries_locked");
    }
    const me = await getPlayerByUser(auth.clubId, auth.userId);
    if (!canManage(auth.role) && me?.id !== row.player_id) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    await query(`DELETE FROM tournament_entries WHERE id = $1 AND club_id = $2`, [
      row.id,
      auth.clubId,
    ]);
    await dropUnscoredRounds(auth.clubId, row.category_id);
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
    const body = z.object({ replacePlayerId: z.string().uuid().optional() }).parse(req.body ?? {});
    const settings = await clubSettings(auth.clubId);
    const entries = await query<{
      player_id: string;
      display_name: string;
      gender: "male" | "female" | null;
      self_level: string | number | null;
      confirmed_level: string | number | null;
    }>(
      `SELECT e.player_id, p.display_name, p.gender, p.self_level, p.confirmed_level
       FROM tournament_entries e JOIN players p ON p.id = e.player_id AND p.club_id = e.club_id
       WHERE e.category_id = $1 AND e.club_id = $2`,
      [category.id, auth.clubId],
    );
    await dropTrailingUnscoredRounds(auth.clubId, category.id);
    const last = await query<{ number: number }>(
      `SELECT number FROM tournament_rounds WHERE category_id = $1 AND club_id = $2 ORDER BY number DESC LIMIT 1`,
      [category.id, auth.clubId],
    );
    if (last.rows[0]) {
      const open = await query<{ n: number }>(
        `SELECT COUNT(*)::int AS n
         FROM tournament_matches m
         JOIN tournament_rounds r ON r.id = m.round_id
         WHERE m.category_id = $1 AND m.club_id = $2 AND r.number = $3
           AND m.b1 IS NOT NULL AND m.b2 IS NOT NULL
           AND (m.score_a IS NULL OR m.score_b IS NULL)`,
        [category.id, auth.clubId, last.rows[0].number],
      );
      if ((open.rows[0]?.n ?? 0) > 0) {
        throw new HttpError(409, "Βάλε σκορ στον γύρο πριν ανοίξεις τον επόμενο", "round_unscored");
      }
      const stopped = await query<{ n: number }>(
        `SELECT COUNT(*)::int AS n
         FROM tournament_matches m
         JOIN tournament_rounds r ON r.id = m.round_id
         WHERE m.category_id = $1 AND m.club_id = $2 AND r.number = $3 AND m.closed`,
        [category.id, auth.clubId, last.rows[0].number],
      );
      if ((stopped.rows[0]?.n ?? 0) > 0) {
        throw new HttpError(409, "Ένα ματς έκλεισε. Δεν ανοίγει νέος γύρος σε αυτή την κατηγορία.", "match_closed");
      }
    }
    const nextNumber = (last.rows[0]?.number ?? 0) + 1;
    const existingMatches = await query<{
      a1: string | null;
      a2: string | null;
      b1: string | null;
      b2: string | null;
      score_a: number | null;
      score_b: number | null;
    }>(
      `SELECT a1, a2, b1, b2, score_a, score_b FROM tournament_matches WHERE category_id = $1 AND club_id = $2`,
      [category.id, auth.clubId],
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
    const lastPlayed = await query<{ a1: string | null; a2: string | null; b1: string | null; b2: string | null }>(
      `SELECT m.a1, m.a2, m.b1, m.b2
       FROM tournament_matches m
       JOIN tournament_rounds r ON r.id = m.round_id
       WHERE m.category_id = $1 AND m.club_id = $2 AND r.number = $3`,
      [category.id, auth.clubId, last.rows[0]?.number ?? 0],
    );
    const playedIds = new Set(
      lastPlayed.rows.flatMap((row) => [row.a1, row.a2, row.b1, row.b2]).filter((id): id is string => Boolean(id)),
    );
    const mustPlayIds =
      playedIds.size === 0
        ? []
        : entries.rows.filter((row) => !playedIds.has(row.player_id)).map((row) => row.player_id);
    const priorPartnerPairs = existingMatches.rows
      .filter((row) => row.a1 && row.a2 && row.b1 && row.b2)
      .flatMap((row) => [
        [row.a1 as string, row.a2 as string] as [string, string],
        [row.b1 as string, row.b2 as string] as [string, string],
      ]);
    const algorithm = tournament.format === "mexicano" ? "mexicano" : settings.pairing.algorithm;
    const pairingPlayers = entries.rows.map((row) => ({
      id: row.player_id,
      name: row.display_name,
      gender: row.gender,
      level: playingLevel(
        row.self_level === null ? null : Number(row.self_level),
        row.confirmed_level === null ? null : Number(row.confirmed_level),
      ),
      standingPoints: points.get(row.player_id) ?? 0,
    }));
    if (tournament.format === "groups_ko") {
      try {
        const nameOf = (id: string) => pairingPlayers.find((player) => player.id === id)?.name ?? "";
        const asTeam = (a1: string, a2: string): BracketTeam => ({
          playerIds: [a1, a2],
          names: [nameOf(a1), nameOf(a2)],
        });
        let drafts: Array<{
          courtIndex: number;
          pairA: BracketTeam;
          pairB: BracketTeam | null;
          groupIndex: number | null;
          stage: "group" | "knockout";
        }>;
        if (!last.rows[0]) {
          const formed = formBracketTeams(pairingPlayers, category.gender === "mixed_doubles");
          if (formed.leftover.length > 0) {
            throw new GroupsError(
              "groups_odd_player",
              `Περισσεύει: ${formed.leftover.map((row) => row.name).join(", ")}. Βάλε ή βγάλε παίκτη ώστε να βγουν ζευγάρια.`,
            );
          }
          const groups = splitIntoGroups(formed.teams);
          for (const group of groups) {
            for (const [seed, team] of group.teams.entries()) {
              await query(
                `INSERT INTO tournament_group_teams (category_id, club_id, group_index, seed, a1, a2)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [category.id, auth.clubId, group.groupIndex, seed, team.playerIds[0], team.playerIds[1]],
              );
            }
          }
          drafts = nextGroupMatchday(groups, new Set()).map((match) => ({
            ...match,
            stage: "group" as const,
          }));
        } else {
          const stored = await query<{
            group_index: number;
            seed: number;
            a1: string;
            a2: string;
          }>(
            `SELECT group_index, seed, a1, a2 FROM tournament_group_teams
             WHERE category_id = $1 AND club_id = $2 ORDER BY group_index, seed`,
            [category.id, auth.clubId],
          );
          const groupIndexes = [...new Set(stored.rows.map((row) => row.group_index))];
          const groups: GroupAssignment[] = groupIndexes.map((index) => ({
            groupIndex: index,
            teams: stored.rows.filter((row) => row.group_index === index).map((row) => asTeam(row.a1, row.a2)),
          }));
          const groupMatches = await query<{
            a1: string | null;
            a2: string | null;
            b1: string | null;
            b2: string | null;
            score_a: number | null;
            score_b: number | null;
          }>(
            `SELECT a1, a2, b1, b2, score_a, score_b FROM tournament_matches
             WHERE category_id = $1 AND club_id = $2 AND stage = 'group'`,
            [category.id, auth.clubId],
          );
          const playedKeys = new Set(
            groupMatches.rows
              .filter((row) => row.a1 && row.a2 && row.b1 && row.b2)
              .map((row) => fixtureKey(asTeam(row.a1 as string, row.a2 as string), asTeam(row.b1 as string, row.b2 as string))),
          );
          const scoredKeys = new Set(
            groupMatches.rows
              .filter(
                (row) =>
                  row.a1 && row.a2 && row.b1 && row.b2 && row.score_a !== null && row.score_b !== null,
              )
              .map((row) => fixtureKey(asTeam(row.a1 as string, row.a2 as string), asTeam(row.b1 as string, row.b2 as string))),
          );
          if (!groupStageComplete(groups, scoredKeys)) {
            drafts = nextGroupMatchday(groups, playedKeys).map((match) => ({
              ...match,
              stage: "group" as const,
            }));
            if (drafts.length === 0) {
              throw new GroupsError("groups_need_three_teams", "Group fixtures are stuck");
            }
          } else {
            const koMatches = await query<{
              a1: string | null;
              a2: string | null;
              b1: string | null;
              b2: string | null;
              score_a: number | null;
              score_b: number | null;
            }>(
              `SELECT m.a1, m.a2, m.b1, m.b2, m.score_a, m.score_b
               FROM tournament_matches m
               JOIN tournament_rounds r ON r.id = m.round_id
               WHERE m.category_id = $1 AND m.club_id = $2 AND m.stage = 'knockout' AND r.number = $3
               ORDER BY m.court_index`,
              [category.id, auth.clubId, last.rows[0].number],
            );
            if (koMatches.rows.length === 0) {
              const tables = groups.map((group) =>
                groupStandings(
                  group.teams,
                  groupMatches.rows
                    .filter(
                      (row) =>
                        row.a1 &&
                        row.a2 &&
                        row.b1 &&
                        row.b2 &&
                        row.score_a !== null &&
                        row.score_b !== null &&
                        group.teams.some(
                          (team) =>
                            [...team.playerIds].sort().join("+") ===
                            [row.a1, row.a2].sort().join("+"),
                        ),
                    )
                    .map((row) => ({
                      pairA: asTeam(row.a1 as string, row.a2 as string),
                      pairB: asTeam(row.b1 as string, row.b2 as string),
                      scoreA: row.score_a as number,
                      scoreB: row.score_b as number,
                    })),
                ),
              );
              drafts = knockoutFromQualifiers(groupQualifiers(tables)).map((match) => ({
                ...match,
                groupIndex: null,
                stage: "knockout" as const,
              }));
            } else {
              drafts = nextKnockoutRound(
                koMatches.rows.map((row) => {
                  if (!row.a1 || !row.a2) {
                    throw new KnockoutError("knockout_need_two_teams", "Missing pair");
                  }
                  return winningTeam({
                    pairA: asTeam(row.a1, row.a2),
                    pairB: row.b1 && row.b2 ? asTeam(row.b1, row.b2) : null,
                    scoreA: row.score_a,
                    scoreB: row.score_b,
                  });
                }),
              ).map((match) => ({ ...match, groupIndex: null, stage: "knockout" as const }));
            }
          }
        }
        const round = await query<{ id: string }>(
          `INSERT INTO tournament_rounds (category_id, club_id, number) VALUES ($1, $2, $3) RETURNING id`,
          [category.id, auth.clubId, nextNumber],
        );
        const roundId = round.rows[0]?.id;
        if (!roundId) {
          throw new HttpError(500, "Αποτυχία γύρου", "round_failed");
        }
        for (const match of drafts) {
          await query(
            `INSERT INTO tournament_matches
               (round_id, category_id, club_id, court_index, a1, a2, b1, b2, stage, group_index)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              roundId,
              category.id,
              auth.clubId,
              match.courtIndex,
              match.pairA.playerIds[0],
              match.pairA.playerIds[1],
              match.pairB?.playerIds[0] ?? null,
              match.pairB?.playerIds[1] ?? null,
              match.stage,
              match.groupIndex,
            ],
          );
        }
        if (tournament.status !== "running") {
          await setTournamentStatus(auth.clubId, tournament.id, "running");
        }
        res.status(201).json({ ok: true, leftover: [], round: nextNumber });
        return;
      } catch (error) {
        if (error instanceof GroupsError) {
          throw new HttpError(400, groupsMessage(error), error.code);
        }
        if (error instanceof KnockoutError) {
          throw new HttpError(knockoutStatus(error.code), knockoutMessage(error), error.code);
        }
        throw error;
      }
    }
    if (tournament.format === "knockout") {
      try {
        const drafts = last.rows[0]
          ? nextKnockoutRound(
              (
                await query<{
                  a1: string | null;
                  a2: string | null;
                  b1: string | null;
                  b2: string | null;
                  score_a: number | null;
                  score_b: number | null;
                }>(
                  `SELECT m.a1, m.a2, m.b1, m.b2, m.score_a, m.score_b
                   FROM tournament_matches m
                   JOIN tournament_rounds r ON r.id = m.round_id
                   WHERE m.category_id = $1 AND m.club_id = $2 AND r.number = $3
                   ORDER BY m.court_index`,
                  [category.id, auth.clubId, last.rows[0].number],
                )
              ).rows.map((row) => {
                if (!row.a1 || !row.a2) {
                  throw new KnockoutError("knockout_need_two_teams", "Missing pair");
                }
                return winningTeam({
                  pairA: bracketTeam([row.a1, row.a2], pairingPlayers),
                  pairB: row.b1 && row.b2 ? bracketTeam([row.b1, row.b2], pairingPlayers) : null,
                  scoreA: row.score_a,
                  scoreB: row.score_b,
                });
              }),
            )
          : (() => {
              const formed = formBracketTeams(pairingPlayers, category.gender === "mixed_doubles");
              if (formed.leftover.length > 0) {
                throw new KnockoutError(
                  "knockout_odd_player",
                  `Περισσεύει: ${formed.leftover.map((row) => row.name).join(", ")}. Βάλε ή βγάλε παίκτη ώστε να βγουν ζευγάρια.`,
                );
              }
              if (formed.teams.length < 2) {
                throw new KnockoutError("knockout_need_two_teams", "Need two pairs");
              }
              return seedFirstRound(formed.teams);
            })();
        const round = await query<{ id: string }>(
          `INSERT INTO tournament_rounds (category_id, club_id, number) VALUES ($1, $2, $3) RETURNING id`,
          [category.id, auth.clubId, nextNumber],
        );
        const roundId = round.rows[0]?.id;
        if (!roundId) {
          throw new HttpError(500, "Αποτυχία γύρου", "round_failed");
        }
        for (const match of drafts) {
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
              match.pairB?.playerIds[0] ?? null,
              match.pairB?.playerIds[1] ?? null,
            ],
          );
        }
        if (tournament.status !== "running") {
          await setTournamentStatus(auth.clubId, tournament.id, "running");
        }
        res.status(201).json({ ok: true, leftover: [], round: nextNumber });
        return;
      } catch (error) {
        if (error instanceof KnockoutError) {
          throw new HttpError(knockoutStatus(error.code), knockoutMessage(error), error.code);
        }
        throw error;
      }
    }
    if (tournament.format === "kotc") {
      try {
        const mixed = category.gender === "mixed_doubles";
        let drafts: Array<{ courtIndex: number; pairA: BracketTeam; pairB: BracketTeam }>;
        if (!last.rows[0]) {
          const formed = formBracketTeams(pairingPlayers, mixed);
          if (formed.teams.length < 2) {
            const extra =
              formed.leftover.length > 0
                ? ` Περισσεύει: ${formed.leftover.map((row) => row.name).join(", ")}.`
                : "";
            throw new KotcError(
              "kotc_need_four",
              `Το King of the Court θέλει τουλάχιστον δύο ζευγάρια (4 παίκτες).${extra}`,
            );
          }
          drafts = seedKotcCourts(formed.teams).matches;
        } else {
          const lastMatches = await query<{
            court_index: number;
            a1: string | null;
            a2: string | null;
            b1: string | null;
            b2: string | null;
            score_a: number | null;
            score_b: number | null;
          }>(
            `SELECT m.court_index, m.a1, m.a2, m.b1, m.b2, m.score_a, m.score_b
             FROM tournament_matches m
             JOIN tournament_rounds r ON r.id = m.round_id
             WHERE m.category_id = $1 AND m.club_id = $2 AND r.number = $3
             ORDER BY m.court_index`,
            [category.id, auth.clubId, last.rows[0].number],
          );
          const results = lastMatches.rows.map((row) => {
            if (
              !row.a1 ||
              !row.a2 ||
              !row.b1 ||
              !row.b2 ||
              row.score_a === null ||
              row.score_b === null
            ) {
              throw new KotcError("kotc_incomplete", "Need a score on every court");
            }
            return {
              courtIndex: row.court_index,
              pairA: bracketTeam([row.a1, row.a2], pairingPlayers),
              pairB: bracketTeam([row.b1, row.b2], pairingPlayers),
              scoreA: row.score_a,
              scoreB: row.score_b,
            };
          });
          const sitting = pairingPlayers.filter((player) => !playedIds.has(player.id));
          const bench = splitKotcBench(sitting, mixed);
          if (bench.singleton && !body.replacePlayerId) {
            throw new HttpError(400, "Διάλεξε σε ποιο ζευγάρι μπαίνει ο παίκτης", "pairing_need_replace");
          }
          if (bench.singleton && body.replacePlayerId) {
            const outgoing = pairingPlayers.find((player) => player.id === body.replacePlayerId);
            if (
              mixed &&
              bench.singleton.gender &&
              outgoing?.gender &&
              bench.singleton.gender !== outgoing.gender
            ) {
              throw new HttpError(400, "Στο μικτό αντικαθιστάς παίκτη ίδιου φύλου", "pairing_need_mixed");
            }
          }
          const rotated = nextKotcRound(results, bench.teams);
          drafts =
            bench.singleton && body.replacePlayerId
              ? replacePlayerInKotc(rotated.matches, bench.singleton, body.replacePlayerId)
              : rotated.matches;
        }
        const round = await query<{ id: string }>(
          `INSERT INTO tournament_rounds (category_id, club_id, number) VALUES ($1, $2, $3) RETURNING id`,
          [category.id, auth.clubId, nextNumber],
        );
        const roundId = round.rows[0]?.id;
        if (!roundId) {
          throw new HttpError(500, "Αποτυχία γύρου", "round_failed");
        }
        for (const match of drafts) {
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
        const playing = new Set(
          drafts.flatMap((match) => [...match.pairA.playerIds, ...match.pairB.playerIds]),
        );
        res.status(201).json({
          ok: true,
          leftover: pairingPlayers
            .filter((player) => !playing.has(player.id))
            .map((player) => ({ id: player.id, name: player.name })),
          round: nextNumber,
        });
        return;
      } catch (error) {
        if (error instanceof KotcError) {
          throw new HttpError(400, kotcMessage(error), error.code);
        }
        throw error;
      }
    }
    try {
      const incomingId = mustPlayIds.length === 1 ? mustPlayIds[0] : undefined;
      let pairing;
      if (incomingId && body.replacePlayerId) {
        const incoming = pairingPlayers.find((player) => player.id === incomingId);
        const outgoing = pairingPlayers.find((player) => player.id === body.replacePlayerId);
        if (
          category.gender === "mixed_doubles" &&
          incoming?.gender &&
          outgoing?.gender &&
          incoming.gender !== outgoing.gender
        ) {
          throw new HttpError(400, "Στο μικτό αντικαθιστάς παίκτη ίδιου φύλου", "pairing_need_mixed");
        }
        const lastOverride = lastPlayed.rows
          .filter((row) => row.a1 && row.a2 && row.b1 && row.b2)
          .map((row) => ({
            pairA: [row.a1 as string, row.a2 as string] as [string, string],
            pairB: [row.b1 as string, row.b2 as string] as [string, string],
          }));
        pairing = pairPlayers(pairingPlayers, {
          algorithm,
          override: swapIncomingForPlayer(lastOverride, incomingId, body.replacePlayerId),
        });
      } else if (incomingId) {
        throw new HttpError(400, "Διάλεξε σε ποιο ζευγάρι μπαίνει ο παίκτης", "pairing_need_replace");
      } else {
        pairing = pairForCategory(pairingPlayers, {
          algorithm,
          mixedDoubles: category.gender === "mixed_doubles",
          mustPlayIds,
          americano: tournament.format === "americano",
          priorPartnerPairs,
        });
      }
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
    const existing = await query<{
      id: string;
      a1: string | null;
      a2: string | null;
      b1: string | null;
      b2: string | null;
      score_a: number | null;
      score_b: number | null;
      closed: boolean;
      format: string;
      stage: string;
    }>(
      `SELECT m.id, m.a1, m.a2, m.b1, m.b2, m.score_a, m.score_b, m.closed, t.format, m.stage
       FROM tournament_matches m
       JOIN tournament_categories c ON c.id = m.category_id
       JOIN tournaments t ON t.id = c.tournament_id
       WHERE m.id = $1 AND m.club_id = $2`,
      [req.params.id, auth.clubId],
    );
    const match = existing.rows[0];
    if (!match) {
      throw new HttpError(404, "Δεν βρέθηκε το ματς", "match_not_found");
    }
    if (match.closed) {
      throw new HttpError(409, "Αυτό το ματς έκλεισε", "match_closed");
    }
    const knockoutScore =
      match.format === "knockout" || (match.format === "groups_ko" && match.stage === "knockout");
    if (knockoutScore && body.scoreA === body.scoreB) {
      throw new HttpError(400, "Στο knockout δεν γίνεται ισοπαλία. Άλλαξε το σκορ.", "knockout_draw");
    }
    if (match.format === "kotc" && body.scoreA === body.scoreB) {
      throw new HttpError(400, "Στο King of the Court δεν γίνεται ισοπαλία. Άλλαξε το σκορ.", "kotc_draw");
    }
    if (knockoutScore && (!match.b1 || !match.b2)) {
      throw new HttpError(400, "Το bye δεν παίρνει σκορ", "knockout_bye");
    }

    await query(
      `UPDATE tournament_matches SET score_a = $3, score_b = $4
       WHERE id = $1 AND club_id = $2`,
      [req.params.id, auth.clubId, body.scoreA, body.scoreB],
    );

    const firstScore = match.score_a === null || match.score_b === null;
    let levels: Array<{ playerId: string; level: number }> = [];
    if (firstScore) {
      const settings = await clubSettings(auth.clubId);
      const ids = [match.a1, match.a2, match.b1, match.b2].filter(
        (id): id is string => Boolean(id),
      );
      const loaded = await Promise.all(ids.map((id) => getPlayer(auth.clubId, id)));
      const rated = (side: Array<string | null>) =>
        side.flatMap((id) => {
          const player = loaded.find((row) => row?.id === id);
          if (!player) {
            return [];
          }
          const level = playingLevel(player.selfLevel, player.confirmedLevel);
          return level === null ? [] : [{ id: player.id, level }];
        });
      const next = nextLevelsAfterMatch({
        teamA: rated([match.a1, match.a2]),
        teamB: rated([match.b1, match.b2]),
        scoreA: body.scoreA,
        scoreB: body.scoreB,
        k: settings.levels.eloK,
        min: settings.levels.min,
        max: settings.levels.max,
        step: settings.levels.step,
      });
      for (const row of next) {
        await updatePlayer(auth.clubId, row.id, { confirmedLevel: row.level });
      }
      levels = next.map((row) => ({ playerId: row.id, level: row.level }));
    }

    res.json({ ok: true, levels });
  }),
);

tournamentsRouter.post(
  "/matches/:id/close",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth || !canScore(auth.role)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const existing = await query<{ id: string; status: TournamentStatus }>(
      `SELECT m.id, t.status
       FROM tournament_matches m
       JOIN tournament_categories c ON c.id = m.category_id
       JOIN tournaments t ON t.id = c.tournament_id
       WHERE m.id = $1 AND m.club_id = $2`,
      [req.params.id, auth.clubId],
    );
    const match = existing.rows[0];
    if (!match) {
      throw new HttpError(404, "Δεν βρέθηκε το ματς", "match_not_found");
    }
    if (match.status === "closed") {
      throw new HttpError(400, "Το τουρνουά είναι κλειστό", "tournament_closed");
    }
    await query(`UPDATE tournament_matches SET closed = TRUE WHERE id = $1 AND club_id = $2`, [
      match.id,
      auth.clubId,
    ]);
    res.json({ ok: true });
  }),
);
