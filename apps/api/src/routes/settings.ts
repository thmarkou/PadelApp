import { parseClubSettings } from "@padelapp/shared";
import { Router } from "express";
import { query } from "../db/pool.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { requireAuth, requireClubId, requireRole } from "../http/auth.js";
import { HttpError } from "../http/errors.js";

export const settingsRouter = Router();

settingsRouter.get(
  "/settings",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const result = await query<{ settings: unknown; updated_at: Date }>(
      "SELECT settings, updated_at FROM club_settings WHERE club_id = $1",
      [clubId],
    );
    const row = result.rows[0];
    if (!row) {
      throw new HttpError(404, "Λείπουν ρυθμίσεις club", "settings_not_found");
    }
    res.json({
      settings: parseClubSettings(row.settings),
      updatedAt: row.updated_at.toISOString(),
    });
  }),
);

settingsRouter.put(
  "/settings",
  requireAuth,
  requireRole("owner", "reception"),
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const settings = parseClubSettings(req.body);
    await query("UPDATE clubs SET name = $2 WHERE id = $1", [clubId, settings.branding.name]);
    const result = await query<{ settings: unknown; updated_at: Date }>(
      `UPDATE club_settings
       SET settings = $2::jsonb, updated_at = now()
       WHERE club_id = $1
       RETURNING settings, updated_at`,
      [clubId, JSON.stringify(settings)],
    );
    const row = result.rows[0];
    if (!row) {
      throw new HttpError(404, "Λείπουν ρυθμίσεις club", "settings_not_found");
    }
    res.json({
      settings: parseClubSettings(row.settings),
      updatedAt: row.updated_at.toISOString(),
    });
  }),
);

