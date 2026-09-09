import {
  canManagePlayers,
  canOverridePairing,
  canProposePairing,
  cyclePairing,
  generateDaySlots,
  isOpenMatch,
  isWithinLevelDelta,
  matchLevel,
  pairPlayers,
  PairingError,
  parseClubSettings,
  playingLevel,
  type PairingResult,
} from "@padelapp/shared";
import { Router } from "express";
import { z } from "zod";
import { getPlayer, getPlayerByUser, resolvePlayer } from "../db/players.js";
import { query } from "../db/pool.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { requireAuth, requireClubId } from "../http/auth.js";
import type { AuthContext } from "../http/auth.js";
import { HttpError } from "../http/errors.js";

function slotKey(value: string): string {
  const match = value.match(/(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})/);
  return match ? `${match[1]}T${match[2]}` : value;
}

function clubSlotKey(value: string, timeZone: string): string {
  const normalized = value.includes("T") ? value : value.replace(" ", "T");
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) {
    return slotKey(value);
  }
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}`;
}

function isDesk(role: AuthContext["role"]): boolean {
  return role === "owner" || role === "reception";
}

async function clubSettings(clubId: string) {
  const row = await query<{ settings: unknown }>(
    "SELECT settings FROM club_settings WHERE club_id = $1",
    [clubId],
  );
  return parseClubSettings(row.rows[0]?.settings);
}

type SpotLevelRow = {
  booking_id: string;
  position: number;
  guest_name: string;
  player_id: string | null;
  added_by: string | null;
  user_id: string | null;
  self_level: string | number | null;
  confirmed_level: string | number | null;
};

function num(value: string | number | null): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function mapSpot(row: SpotLevelRow) {
  return {
    position: row.position,
    name: row.guest_name,
    playerId: row.player_id,
    addedBy: row.added_by,
    level: playingLevel(num(row.self_level), num(row.confirmed_level)),
    userId: row.user_id,
  };
}

async function spotsForBookings(clubId: string, bookingIds: string[]): Promise<SpotLevelRow[]> {
  if (bookingIds.length === 0) {
    return [];
  }
  const placeholders = bookingIds.map((_, index) => `$${index + 2}`).join(", ");
  const result = await query<SpotLevelRow>(
    `SELECT bs.booking_id, bs.position, bs.guest_name, bs.player_id, bs.added_by,
            p.user_id, p.self_level, p.confirmed_level
     FROM booking_spots bs
     LEFT JOIN players p ON p.id = bs.player_id
     WHERE bs.club_id = $1 AND bs.booking_id IN (${placeholders})
     ORDER BY bs.position`,
    [clubId, ...bookingIds],
  );
  return result.rows;
}

function isMine(
  userId: string | undefined,
  createdBy: string | null,
  spots: Array<{ addedBy: string | null; userId: string | null }>,
): boolean {
  return Boolean(
    userId &&
      (createdBy === userId ||
        spots.some((spot) => spot.addedBy === userId || spot.userId === userId)),
  );
}

function isOnBooking(
  userId: string | undefined,
  spots: Array<{ addedBy: string | null; userId: string | null }>,
): boolean {
  return Boolean(userId && spots.some((spot) => spot.addedBy === userId || spot.userId === userId));
}

function readPairing(value: unknown): PairingResult | null {
  if (!value || typeof value !== "object") {
    return null;
  }
  const record = value as PairingResult;
  if (record.algorithm !== "snake" && record.algorithm !== "mexicano") {
    return null;
  }
  if (!Array.isArray(record.matches)) {
    return null;
  }
  return record;
}

async function clearPairing(bookingId: string, clubId: string): Promise<void> {
  await query("UPDATE bookings SET pairing = NULL WHERE id = $1 AND club_id = $2", [bookingId, clubId]);
}

function pairingPlayers(rows: SpotLevelRow[]) {
  return rows.map((row, index) => ({
    id: row.player_id ?? `guest:${row.position}:${index}`,
    name: row.guest_name,
    level: playingLevel(num(row.self_level), num(row.confirmed_level)),
  }));
}

const spotInput = z.object({
  playerId: z.string().uuid().optional(),
  name: z.string().min(1),
});

export const bookingsRouter = Router();

bookingsRouter.get(
  "/slots",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.date);
    const durationOverride = req.query.duration
      ? z.coerce.number().int().min(15).max(240).parse(req.query.duration)
      : undefined;

    const settings = await clubSettings(clubId);
    const duration = durationOverride ?? settings.defaultSlotDurationMinutes;
    if (!settings.slotTemplates.some((template) => template.durationMinutes === duration)) {
      throw new HttpError(400, "Αυτή η διάρκεια σλοτ δεν επιτρέπεται στο club", "slot_duration_not_allowed");
    }

    const courts = await query<{
      id: string;
      name: string;
      kind: "indoor" | "outdoor";
      open_time: string;
      close_time: string;
      is_active: boolean;
      maintenance_until: Date | null;
    }>(
      `SELECT id, name, kind, open_time::text, close_time::text, is_active, maintenance_until
       FROM courts WHERE club_id = $1 AND is_active = true
       ORDER BY sort_order, name`,
      [clubId],
    );

    const bookings = await query<{
      id: string;
      court_id: string;
      starts_at: string;
      duration_minutes: number;
      created_by: string | null;
      pairing: unknown;
    }>(
      `SELECT id, court_id, starts_at::text, duration_minutes, created_by, pairing
       FROM bookings
       WHERE club_id = $1 AND status = 'confirmed'
         AND starts_at::date = $2::date`,
      [clubId, date],
    );

    const spots = await query<{
      booking_id: string;
      position: number;
      guest_name: string;
      player_id: string | null;
      added_by: string | null;
    }>(
      `SELECT booking_id, position, guest_name, player_id, added_by
       FROM booking_spots WHERE club_id = $1`,
      [clubId],
    );

    const waitlist = await query<{
      id: string;
      court_id: string;
      starts_at: string;
      guest_name: string;
    }>(
      `SELECT id, court_id, starts_at::text, guest_name
       FROM waitlist_entries WHERE club_id = $1 AND starts_at::date = $2::date`,
      [clubId, date],
    );

    const userId = req.auth?.userId;
    const desk = req.auth ? isDesk(req.auth.role) : false;
    const myPlayer = userId ? await getPlayerByUser(clubId, userId) : undefined;

    res.json({
      date,
      durationMinutes: duration,
      cancelHoursBefore: settings.bookingRules.cancelHoursBefore,
      waitlistEnabled: settings.bookingRules.waitlistEnabled,
      courts: courts.rows.map((court) => {
        const generated = generateDaySlots({
          date,
          openTime: court.open_time,
          closeTime: court.close_time,
          durationMinutes: duration,
          bufferMinutes: settings.slotBufferMinutes,
        });
        return {
          id: court.id,
          name: court.name,
          kind: court.kind,
          slots: generated.map((slot) => {
            const start = new Date(slot.startsAt.includes("T") ? slot.startsAt : `${slot.startsAt}:00`);
            if (court.maintenance_until && start < court.maintenance_until) {
              return {
                startsAt: slot.startsAt,
                durationMinutes: slot.durationMinutes,
                maintenance: true,
                booking: null,
                waitlist: [],
                waitlistCount: 0,
              };
            }
            const booking = bookings.rows.find(
              (row) =>
                row.court_id === court.id &&
                clubSlotKey(row.starts_at, settings.timezone) === slotKey(slot.startsAt),
            );
            const bookingSpots = booking
              ? spots.rows
                  .filter((spot) => spot.booking_id === booking.id)
                  .sort((a, b) => a.position - b.position)
                  .map((spot) => ({
                    position: spot.position,
                    name: spot.guest_name,
                    playerId: spot.player_id,
                    addedBy: spot.added_by,
                  }))
              : [];
            const wait = waitlist.rows.filter(
              (row) =>
                row.court_id === court.id &&
                clubSlotKey(row.starts_at, settings.timezone) === slotKey(slot.startsAt),
            );
            const mine = Boolean(
              booking &&
                (booking.created_by === userId ||
                  bookingSpots.some(
                    (spot) =>
                      spot.addedBy === userId || (myPlayer && spot.playerId === myPlayer.id),
                  )),
            );
            const meOnBooking = Boolean(
              booking &&
                bookingSpots.some(
                  (spot) => spot.addedBy === userId || (myPlayer && spot.playerId === myPlayer.id),
                ),
            );
            return {
              startsAt: slot.startsAt,
              durationMinutes: slot.durationMinutes,
              maintenance: false,
              booking: booking
                ? {
                    id: booking.id,
                    createdBy: booking.created_by,
                    mine,
                    meOnBooking,
                    spots: bookingSpots,
                    openSpots: Math.max(0, 4 - bookingSpots.length),
                    pairing: readPairing(booking.pairing),
                  }
                : null,
              waitlistCount: wait.length,
              waitlist: desk ? wait.map((row) => ({ id: row.id, guestName: row.guest_name })) : [],
            };
          }),
        };
      }),
    });
  }),
);

async function assertNoClash(
  clubId: string,
  courtId: string,
  startsAt: string,
  durationMinutes: number,
): Promise<void> {
  const clash = await query<{ id: string }>(
    `SELECT id FROM bookings
     WHERE club_id = $1 AND court_id = $2 AND status = 'confirmed'
       AND starts_at < $3::timestamptz + ($4 * interval '1 minute')
       AND starts_at + (duration_minutes * interval '1 minute') > $3::timestamptz`,
    [clubId, courtId, startsAt, durationMinutes],
  );
  if (clash.rows[0]) {
    throw new HttpError(409, "Το σλοτ είναι ήδη κλεισμένο", "slot_taken");
  }
}

bookingsRouter.get(
  "/open-matches",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const days = z.coerce.number().int().min(1).max(14).optional().parse(req.query.days) ?? 7;
    const settings = await clubSettings(auth.clubId);
    const bookings = await query<{
      id: string;
      court_id: string;
      court_name: string;
      starts_at: string;
      duration_minutes: number;
      created_by: string | null;
    }>(
      `SELECT b.id, b.court_id, c.name AS court_name, b.starts_at::text, b.duration_minutes, b.created_by
       FROM bookings b
       JOIN courts c ON c.id = b.court_id
       WHERE b.club_id = $1 AND b.status = 'confirmed'
         AND b.starts_at > now()
         AND b.starts_at < now() + ($2 * interval '1 day')
       ORDER BY b.starts_at, c.sort_order, c.name`,
      [auth.clubId, days],
    );
    const spotRows = await spotsForBookings(
      auth.clubId,
      bookings.rows.map((row) => row.id),
    );
    const me = await getPlayerByUser(auth.clubId, auth.userId);
    const myLevel = me ? playingLevel(me.selfLevel, me.confirmedLevel) : null;
    const staff = canManagePlayers(auth.role);

    const matches = bookings.rows.flatMap((booking) => {
      const spots = spotRows.filter((row) => row.booking_id === booking.id).map(mapSpot);
      const openSpots = Math.max(0, 4 - spots.length);
      if (!isOpenMatch(openSpots, settings.openMatch.allowedMissing)) {
        return [];
      }
      const level = matchLevel(spots.map((spot) => spot.level));
      const mine = isMine(auth.userId, booking.created_by, spots);
      const meOnBooking = isOnBooking(auth.userId, spots);
      const inRange = isWithinLevelDelta(myLevel, level, settings.openMatch.levelDelta);
      if (!staff && !inRange && !mine) {
        return [];
      }
      return [
        {
          bookingId: booking.id,
          courtId: booking.court_id,
          courtName: booking.court_name,
          startsAt: clubSlotKey(booking.starts_at, settings.timezone),
          durationMinutes: booking.duration_minutes,
          openSpots,
          matchLevel: level,
          inRange,
          mine,
          meOnBooking,
          spots: spots.map((spot) => ({
            position: spot.position,
            name: spot.name,
            playerId: spot.playerId,
            level: spot.level,
          })),
        },
      ];
    });

    res.json({
      days,
      levelDelta: settings.openMatch.levelDelta,
      allowedMissing: settings.openMatch.allowedMissing,
      myLevel,
      matches,
    });
  }),
);

bookingsRouter.post(
  "/bookings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const body = z
      .object({
        courtId: z.string().uuid(),
        startsAt: z.string().min(1),
        durationMinutes: z.number().int().min(15).max(240),
        spots: z.array(spotInput).min(1).max(4),
      })
      .parse(req.body);
    const settings = await clubSettings(clubId);
    if (!settings.slotTemplates.some((template) => template.durationMinutes === body.durationMinutes)) {
      throw new HttpError(400, "Αυτή η διάρκεια σλοτ δεν επιτρέπεται στο club", "slot_duration_not_allowed");
    }

    const court = await query<{ id: string }>(
      "SELECT id FROM courts WHERE id = $1 AND club_id = $2 AND is_active = true",
      [body.courtId, clubId],
    );
    if (!court.rows[0]) {
      throw new HttpError(404, "Δεν βρέθηκε το γήπεδο", "court_not_found");
    }

    await assertNoClash(clubId, body.courtId, body.startsAt, body.durationMinutes);

    const created = await query<{ id: string }>(
      `INSERT INTO bookings (club_id, court_id, starts_at, duration_minutes, status, created_by)
       VALUES ($1, $2, $3::timestamptz, $4, 'confirmed', $5)
       RETURNING id`,
      [clubId, body.courtId, body.startsAt, body.durationMinutes, req.auth?.userId ?? null],
    );
    const bookingId = created.rows[0]?.id;
    if (!bookingId) {
      throw new HttpError(500, "Αποτυχία κράτησης", "booking_failed");
    }
    for (const [index, spot] of body.spots.entries()) {
      const player = await resolvePlayer(clubId, spot);
      await query(
        `INSERT INTO booking_spots (booking_id, club_id, position, guest_name, player_id, added_by)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bookingId, clubId, index + 1, player.displayName, player.id, req.auth?.userId ?? null],
      );
    }
    res.status(201).json({ id: bookingId });
  }),
);

bookingsRouter.post(
  "/bookings/:bookingId/spots",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const body = spotInput.parse(req.body);
    const booking = await query<{ id: string }>(
      `SELECT id FROM bookings WHERE id = $1 AND club_id = $2 AND status = 'confirmed'`,
      [req.params.bookingId, auth.clubId],
    );
    if (!booking.rows[0]) {
      throw new HttpError(404, "Δεν βρέθηκε η κράτηση", "booking_not_found");
    }
    const existing = await spotsForBookings(auth.clubId, [req.params.bookingId]);
    if (existing.length >= 4) {
      throw new HttpError(409, "Η τετράδα είναι γεμάτη", "booking_full");
    }
    const player = await resolvePlayer(auth.clubId, body);
    if (existing.some((row) => row.guest_name.toLowerCase() === player.displayName.toLowerCase())) {
      throw new HttpError(409, "Ο παίκτης είναι ήδη στην κράτηση", "already_on_booking");
    }

    const settings = await clubSettings(auth.clubId);
    const openSpots = Math.max(0, 4 - existing.length);
    if (isOpenMatch(openSpots, settings.openMatch.allowedMissing) && !canManagePlayers(auth.role)) {
      const record = await getPlayer(auth.clubId, player.id);
      const joinerLevel = record ? playingLevel(record.selfLevel, record.confirmedLevel) : null;
      const current = matchLevel(existing.map((row) => playingLevel(num(row.self_level), num(row.confirmed_level))));
      if (!isWithinLevelDelta(joinerLevel, current, settings.openMatch.levelDelta)) {
        throw new HttpError(
          403,
          joinerLevel === null
            ? "Χρειάζεται επίπεδο στο προφίλ για ανοιχτό ματς"
            : "Το επίπεδο είναι εκτός του ± του club",
          joinerLevel === null ? "level_required" : "level_out_of_range",
        );
      }
    }

    const position = (existing.at(-1)?.position ?? 0) + 1;
    await query(
      `INSERT INTO booking_spots (booking_id, club_id, position, guest_name, player_id, added_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [req.params.bookingId, auth.clubId, position, player.displayName, player.id, auth.userId],
    );
    await clearPairing(req.params.bookingId, auth.clubId);
    res.status(201).json({ ok: true, position });
  }),
);

bookingsRouter.post(
  "/bookings/:bookingId/cancel",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const settings = await clubSettings(clubId);
    const booking = await query<{ id: string; starts_at: Date; created_by: string | null }>(
      `SELECT id, starts_at, created_by FROM bookings
       WHERE id = $1 AND club_id = $2 AND status = 'confirmed'`,
      [req.params.bookingId, clubId],
    );
    const row = booking.rows[0];
    if (!row) {
      throw new HttpError(404, "Δεν βρέθηκε η κράτηση", "booking_not_found");
    }
    const spots = await query<{ added_by: string | null }>(
      "SELECT added_by FROM booking_spots WHERE booking_id = $1",
      [row.id],
    );
    const mine =
      row.created_by === req.auth?.userId ||
      spots.rows.some((spot) => spot.added_by === req.auth?.userId);
    const desk = req.auth ? isDesk(req.auth.role) : false;
    if (!desk && !mine) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const hoursLeft = (row.starts_at.getTime() - Date.now()) / 3_600_000;
    if (!desk && hoursLeft < settings.bookingRules.cancelHoursBefore) {
      throw new HttpError(400, "Ακύρωση εκτός ορίου ωρών", "cancel_too_late");
    }
    await query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND club_id = $2`, [
      row.id,
      clubId,
    ]);
    res.json({ ok: true });
  }),
);

bookingsRouter.post(
  "/bookings/:bookingId/leave",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const settings = await clubSettings(auth.clubId);
    const booking = await query<{ id: string; starts_at: Date }>(
      `SELECT id, starts_at FROM bookings
       WHERE id = $1 AND club_id = $2 AND status = 'confirmed'`,
      [req.params.bookingId, auth.clubId],
    );
    const row = booking.rows[0];
    if (!row) {
      throw new HttpError(404, "Δεν βρέθηκε η κράτηση", "booking_not_found");
    }
    const hoursLeft = (row.starts_at.getTime() - Date.now()) / 3_600_000;
    if (!isDesk(auth.role) && hoursLeft < settings.bookingRules.cancelHoursBefore) {
      throw new HttpError(400, "Ακύρωση εκτός ορίου ωρών", "cancel_too_late");
    }
    const me = await getPlayerByUser(auth.clubId, auth.userId);
    const removed = await query<{ position: number }>(
      `DELETE FROM booking_spots
       WHERE booking_id = $1 AND club_id = $2
         AND (added_by = $3 OR player_id = $4)
       RETURNING position`,
      [row.id, auth.clubId, auth.userId, me?.id ?? null],
    );
    if (removed.rows.length === 0) {
      throw new HttpError(404, "Δεν είσαι σε αυτή την κράτηση", "not_on_booking");
    }
    const remaining = await query<{ count: string }>(
      "SELECT count(*)::text AS count FROM booking_spots WHERE booking_id = $1",
      [row.id],
    );
    if (remaining.rows[0]?.count === "0") {
      await query(`UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND club_id = $2`, [
        row.id,
        auth.clubId,
      ]);
    } else {
      await clearPairing(row.id, auth.clubId);
    }
    res.json({ ok: true, left: removed.rows.length });
  }),
);

bookingsRouter.post(
  "/bookings/:bookingId/pair",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth || !canProposePairing(auth.role)) {
      throw new HttpError(403, "Δεν επιτρέπεται", "forbidden");
    }
    const settings = await clubSettings(auth.clubId);
    const booking = await query<{ id: string }>(
      `SELECT id FROM bookings WHERE id = $1 AND club_id = $2 AND status = 'confirmed'`,
      [req.params.bookingId, auth.clubId],
    );
    if (!booking.rows[0]) {
      throw new HttpError(404, "Δεν βρέθηκε η κράτηση", "booking_not_found");
    }
    const spots = await spotsForBookings(auth.clubId, [req.params.bookingId]);
    try {
      const pairing = pairPlayers(pairingPlayers(spots), { algorithm: settings.pairing.algorithm });
      await query("UPDATE bookings SET pairing = $3::jsonb WHERE id = $1 AND club_id = $2", [
        req.params.bookingId,
        auth.clubId,
        JSON.stringify(pairing),
      ]);
      res.json({ pairing });
    } catch (error) {
      if (error instanceof PairingError) {
        throw new HttpError(400, error.message, error.code);
      }
      throw error;
    }
  }),
);

bookingsRouter.post(
  "/bookings/:bookingId/pair/cycle",
  requireAuth,
  asyncHandler(async (req, res) => {
    const auth = req.auth;
    if (!auth) {
      throw new HttpError(401, "Λείπει σύνδεση", "missing_auth");
    }
    const settings = await clubSettings(auth.clubId);
    if (!canOverridePairing(auth.role, settings.pairing.allowAdminOverride)) {
      throw new HttpError(403, "Η εναλλαγή ζευγαριών είναι κλειστή για αυτό το club", "pairing_override_disabled");
    }
    const booking = await query<{ id: string; pairing: unknown }>(
      `SELECT id, pairing FROM bookings WHERE id = $1 AND club_id = $2 AND status = 'confirmed'`,
      [req.params.bookingId, auth.clubId],
    );
    const row = booking.rows[0];
    if (!row) {
      throw new HttpError(404, "Δεν βρέθηκε η κράτηση", "booking_not_found");
    }
    const current = readPairing(row.pairing);
    if (!current) {
      throw new HttpError(400, "Δεν υπάρχουν ζευγάρια ακόμα", "pairing_missing");
    }
    const spots = await spotsForBookings(auth.clubId, [req.params.bookingId]);
    try {
      const pairing = cyclePairing(pairingPlayers(spots), current);
      await query("UPDATE bookings SET pairing = $3::jsonb WHERE id = $1 AND club_id = $2", [
        req.params.bookingId,
        auth.clubId,
        JSON.stringify(pairing),
      ]);
      res.json({ pairing });
    } catch (error) {
      if (error instanceof PairingError) {
        throw new HttpError(400, error.message, error.code);
      }
      throw error;
    }
  }),
);

bookingsRouter.post(
  "/waitlist",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const settings = await clubSettings(clubId);
    if (!settings.bookingRules.waitlistEnabled) {
      throw new HttpError(400, "Η λίστα αναμονής είναι κλειστή για αυτό το club", "waitlist_disabled");
    }
    const body = z
      .object({
        courtId: z.string().uuid(),
        startsAt: z.string().min(1),
        durationMinutes: z.number().int().min(15).max(240),
        name: z.string().min(1),
        playerId: z.string().uuid().optional(),
      })
      .parse(req.body);
    const player = await resolvePlayer(clubId, body);
    const created = await query<{ id: string }>(
      `INSERT INTO waitlist_entries (club_id, court_id, starts_at, duration_minutes, guest_name)
       VALUES ($1, $2, $3::timestamptz, $4, $5)
       RETURNING id`,
      [clubId, body.courtId, body.startsAt, body.durationMinutes, player.displayName],
    );
    res.status(201).json({ id: created.rows[0]?.id });
  }),
);
