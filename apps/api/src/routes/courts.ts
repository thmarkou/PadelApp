import { Router } from "express";
import { z } from "zod";
import { query } from "../db/pool.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { requireAuth, requireClubId, requireRole } from "../http/auth.js";
import { HttpError } from "../http/errors.js";

const courtBody = z.object({
  name: z.string().min(1),
  kind: z.enum(["indoor", "outdoor"]),
  openTime: z.string().regex(/^\d{2}:\d{2}/),
  closeTime: z.string().regex(/^\d{2}:\d{2}/),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().optional(),
  maintenanceUntil: z.string().datetime().nullable().optional(),
});

type CourtRow = {
  id: string;
  club_id: string;
  name: string;
  kind: "indoor" | "outdoor";
  open_time: string;
  close_time: string;
  is_active: boolean;
  maintenance_until: Date | null;
  sort_order: number;
};

function mapCourt(row: CourtRow) {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    kind: row.kind,
    openTime: row.open_time.slice(0, 5),
    closeTime: row.close_time.slice(0, 5),
    isActive: row.is_active,
    maintenanceUntil: row.maintenance_until?.toISOString() ?? null,
    sortOrder: row.sort_order,
  };
}

export const courtsRouter = Router();

courtsRouter.get(
  "/courts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const result = await query<CourtRow>(
      `SELECT id, club_id, name, kind, open_time::text, close_time::text,
              is_active, maintenance_until, sort_order
       FROM courts
       WHERE club_id = $1
       ORDER BY sort_order, name`,
      [clubId],
    );
    res.json({ courts: result.rows.map(mapCourt) });
  }),
);

courtsRouter.post(
  "/courts",
  requireAuth,
  requireRole("owner", "reception"),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const body = courtBody.parse(req.body);
    const result = await query<{ id: string }>(
      `INSERT INTO courts (club_id, name, kind, open_time, close_time, is_active, sort_order)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        clubId,
        body.name,
        body.kind,
        body.openTime.slice(0, 5),
        body.closeTime.slice(0, 5),
        body.isActive ?? true,
        body.sortOrder ?? 0,
      ],
    );
    const id = result.rows[0]?.id;
    if (!id) {
      throw new HttpError(500, "Αποτυχία δημιουργίας γηπέδου", "court_create_failed");
    }
    res.status(201).json({ id });
  }),
);

courtsRouter.patch(
  "/courts/:courtId",
  requireAuth,
  requireRole("owner", "reception"),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const body = courtBody.partial().parse(req.body);
    const existing = await query<{ id: string }>(
      "SELECT id FROM courts WHERE id = $1 AND club_id = $2",
      [req.params.courtId, clubId],
    );
    if (!existing.rows[0]) {
      throw new HttpError(404, "Δεν βρέθηκε το γήπεδο", "court_not_found");
    }
    await query(
      `UPDATE courts SET
         name = COALESCE($3, name),
         kind = COALESCE($4, kind),
         open_time = COALESCE($5, open_time),
         close_time = COALESCE($6, close_time),
         is_active = COALESCE($7, is_active),
         sort_order = COALESCE($8, sort_order),
         maintenance_until = CASE WHEN $9::boolean THEN $10::timestamptz ELSE maintenance_until END
       WHERE id = $1 AND club_id = $2`,
      [
        req.params.courtId,
        clubId,
        body.name ?? null,
        body.kind ?? null,
        body.openTime?.slice(0, 5) ?? null,
        body.closeTime?.slice(0, 5) ?? null,
        body.isActive ?? null,
        body.sortOrder ?? null,
        body.maintenanceUntil !== undefined,
        body.maintenanceUntil ?? null,
      ],
    );
    res.json({ ok: true });
  }),
);
