import type { AppRole } from "@padelapp/shared";
import { Router } from "express";
import { z } from "zod";
import { newSessionToken, verifyPassword } from "../auth/password.js";
import { query } from "../db/pool.js";
import { asyncHandler } from "../http/asyncHandler.js";
import { requireAuth, requireClubId } from "../http/auth.js";
import { HttpError } from "../http/errors.js";

const loginBody = z.object({
  clubSlug: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(1),
});

export const authRouter = Router();

authRouter.get(
  "/public/clubs",
  asyncHandler(async (_req, res) => {
    const result = await query<{ slug: string; name: string }>(
      "SELECT slug, name FROM clubs ORDER BY name",
    );
    res.json({ clubs: result.rows });
  }),
);

authRouter.post(
  "/auth/login",
  asyncHandler(async (req, res) => {
    const body = loginBody.parse(req.body);
    const user = await query<{
      id: string;
      club_id: string;
      email: string;
      display_name: string;
      role: AppRole;
      password_hash: string;
      slug: string;
      club_name: string;
      created_at: Date;
    }>(
      `SELECT u.id, u.club_id, u.email, u.display_name, u.role, u.password_hash,
              c.slug, c.name AS club_name, c.created_at
       FROM users u
       JOIN clubs c ON c.id = u.club_id
       WHERE c.slug = $1 AND u.email = $2`,
      [body.clubSlug, body.email.toLowerCase()],
    );
    const row = user.rows[0];
    if (!row || !(await verifyPassword(body.password, row.password_hash))) {
      throw new HttpError(401, "Λάθος στοιχεία", "invalid_credentials");
    }

    const token = newSessionToken();
    await query(
      `INSERT INTO sessions (token, user_id, club_id, expires_at)
       VALUES ($1, $2, $3, now() + interval '14 days')`,
      [token, row.id, row.club_id],
    );

    res.json({
      token,
      user: {
        id: row.id,
        clubId: row.club_id,
        email: row.email,
        displayName: row.display_name,
        role: row.role,
      },
      club: {
        id: row.club_id,
        slug: row.slug,
        name: row.club_name,
        createdAt: row.created_at.toISOString(),
      },
    });
  }),
);

authRouter.post(
  "/auth/logout",
  requireAuth,
  asyncHandler(async (req, res) => {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    if (token) {
      await query("DELETE FROM sessions WHERE token = $1", [token]);
    }
    res.json({ ok: true });
  }),
);

authRouter.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const clubId = requireClubId(req);
    const club = await query<{ id: string; slug: string; name: string; created_at: Date }>(
      "SELECT id, slug, name, created_at FROM clubs WHERE id = $1",
      [clubId],
    );
    const row = club.rows[0];
    if (!row || !req.auth) {
      throw new HttpError(404, "Δεν βρέθηκε το club", "club_not_found");
    }
    res.json({
      user: {
        id: req.auth.userId,
        clubId: req.auth.clubId,
        email: req.auth.email,
        displayName: req.auth.displayName,
        role: req.auth.role,
      },
      club: {
        id: row.id,
        slug: row.slug,
        name: row.name,
        createdAt: row.created_at.toISOString(),
      },
    });
  }),
);
