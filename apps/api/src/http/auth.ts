import type { NextFunction, Request, Response } from "express";
import type { AppRole } from "@padelapp/shared";
import { query } from "../db/pool.js";
import { asyncHandler } from "./asyncHandler.js";
import { HttpError } from "./errors.js";

export type AuthContext = {
  userId: string;
  clubId: string;
  email: string;
  displayName: string;
  role: AppRole;
};

declare global {
  namespace Express {
    interface Request {
      auth?: AuthContext;
    }
  }
}

export const requireAuth = asyncHandler(async (req, _res, next) => {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
  if (!token) {
    next(new HttpError(401, "Λείπει σύνδεση", "missing_auth"));
    return;
  }

  const result = await query<{
    user_id: string;
    club_id: string;
    email: string;
    display_name: string;
    role: AppRole;
  }>(
    `SELECT s.user_id, s.club_id, u.email, u.display_name, u.role
     FROM sessions s
     JOIN users u ON u.id = s.user_id AND u.club_id = s.club_id
     WHERE s.token = $1 AND s.expires_at > now()`,
    [token],
  );

  const row = result.rows[0];
  if (!row) {
    next(new HttpError(401, "Η σύνδεση έληξε", "session_expired"));
    return;
  }

  req.auth = {
    userId: row.user_id,
    clubId: row.club_id,
    email: row.email,
    displayName: row.display_name,
    role: row.role,
  };
  next();
});

export function requireClubId(req: Request): string {
  const clubId = req.auth?.clubId;
  if (!clubId) {
    throw new HttpError(401, "Λείπει club_id", "missing_club");
  }
  return clubId;
}

export function requireRole(...roles: AppRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const role = req.auth?.role;
    if (!role || !roles.includes(role)) {
      next(new HttpError(403, "Δεν επιτρέπεται", "forbidden"));
      return;
    }
    next();
  };
}
