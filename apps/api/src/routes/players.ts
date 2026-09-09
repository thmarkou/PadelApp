import type { AppRole } from "@padelapp/shared";
import {
  canConfirmPlayerLevel,
  canErasePlayer,
  canManagePlayers,
  parseClubSettings,
  playerGenders,
  snapLevel,
} from "@padelapp/shared";
import { Router } from "express";
import { z } from "zod";
import {
  createPlayer,
  erasePlayer,
  ensurePlayerForUser,
  getPlayer,
  searchPlayers,
  updatePlayer,
} from "../db/players.js";
import { query } from "../db/pool.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { requireAuth, requireClubId } from "../http/auth.js";
import { HttpError } from "../http/errors.js";

export const playersRouter = Router();
const optionalText = z.string().trim().max(80).nullable().optional();
const optionalLevel = z.number().nullable().optional();
const optionalGender = z.enum(playerGenders).nullable().optional();
const optionalBirthYear = z
  .number()
  .int()
  .min(1930)
  .max(new Date().getFullYear())
  .nullable()
  .optional();

async function clubLevels(clubId: string) {
  const row = await query<{ settings: unknown }>(
    "SELECT settings FROM club_settings WHERE club_id = $1",
    [clubId],
  );
  return parseClubSettings(row.rows[0]?.settings).levels;
}

function snapOrNull(value: number | null | undefined, levels: { min: number; max: number; step: number }) {
  if (value === null || value === undefined) {
    return null;
  }
  return snapLevel(value, levels.min, levels.max, levels.step);
}

playersRouter.get(
  "/players",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const q = z.string().optional().parse(req.query.q) ?? "";
    res.json({ players: await searchPlayers(clubId, q) });
  }),
);

playersRouter.get(
  "/players/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const player = await ensurePlayerForUser({
      clubId: auth.clubId,
      userId: auth.userId,
      displayName: auth.displayName,
      email: auth.email,
    });
    res.json({ player });
  }),
);

playersRouter.get(
  "/players/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const player = await getPlayer(clubId, req.params.id);
    if (!player) {
      throw new HttpError(404, "Δεν βρέθηκε ο παίκτης", "player_not_found");
    }
    res.json({ player });
  }),
);

playersRouter.post(
  "/players",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth || !canManagePlayers(auth.role)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const body = z
      .object({
        name: z.string().min(1).optional(),
        displayName: z.string().min(1).optional(),
        phone: optionalText,
        email: optionalText,
        gender: optionalGender,
        birthYear: optionalBirthYear,
        selfLevel: optionalLevel,
      })
      .parse(req.body);
    const displayName = (body.displayName ?? body.name ?? "").trim();
    if (!displayName) {
      throw new HttpError(400, "Μη έγκυρα δεδομένα", "invalid_data");
    }
    const levels = await clubLevels(auth.clubId);
    const player = await createPlayer({
      clubId: auth.clubId,
      displayName,
      phone: body.phone ?? null,
      email: body.email ?? null,
      gender: body.gender ?? null,
      birthYear: body.birthYear ?? null,
      selfLevel: snapOrNull(body.selfLevel, levels),
    });
    res.status(201).json({ player, id: player.id, displayName: player.displayName });
  }),
);

playersRouter.patch(
  "/players/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const player = await getPlayer(auth.clubId, req.params.id);
    if (!player) {
      throw new HttpError(404, "Δεν βρέθηκε ο παίκτης", "player_not_found");
    }
    const isSelf = player.userId === auth.userId;
    const staff = canManagePlayers(auth.role);
    if (!isSelf && !staff) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const body = z
      .object({
        displayName: z.string().min(1).optional(),
        phone: optionalText,
        email: optionalText,
        gender: optionalGender,
        birthYear: optionalBirthYear,
        selfLevel: optionalLevel,
      })
      .parse(req.body);
    const levels = await clubLevels(auth.clubId);
    const updated = await updatePlayer(auth.clubId, player.id, {
      displayName: body.displayName,
      phone: body.phone,
      email: body.email,
      gender: body.gender,
      birthYear: body.birthYear,
      selfLevel: body.selfLevel === undefined ? undefined : snapOrNull(body.selfLevel, levels),
    });
    res.json({ player: updated });
  }),
);

playersRouter.post(
  "/players/:id/confirm-level",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const levels = await clubLevels(auth.clubId);
    if (!canConfirmPlayerLevel(auth.role, levels.confirmRole)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const body = z.object({ level: z.number() }).parse(req.body);
    const player = await updatePlayer(auth.clubId, req.params.id, {
      confirmedLevel: snapLevel(body.level, levels.min, levels.max, levels.step),
    });
    if (!player) {
      throw new HttpError(404, "Δεν βρέθηκε ο παίκτης", "player_not_found");
    }
    res.json({ player });
  }),
);

playersRouter.delete(
  "/players/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const player = await getPlayer(auth.clubId, req.params.id);
    if (!player) {
      throw new HttpError(404, "Δεν βρέθηκε ο παίκτης", "player_not_found");
    }
    let userRole: AppRole | null = null;
    if (player.userId) {
      const linked = await query<{ role: AppRole }>(
        "SELECT role FROM users WHERE id = $1 AND club_id = $2",
        [player.userId, auth.clubId],
      );
      userRole = linked.rows[0]?.role ?? null;
    }
    if (!canErasePlayer({ role: auth.role, userId: auth.userId }, { userId: player.userId, userRole })) {
      throw new HttpError(
        403,
        userRole === "owner" ? "Δεν διαγράφεται ο owner" : "Δεν επιτρέπεται",
        userRole === "owner" ? "cannot_erase_owner" : "forbidden",
      );
    }
    await erasePlayer(auth.clubId, player);
    res.json({ ok: true, erased: true });
  }),
);
