import type { AppRole } from "./types.js";

export function canErasePlayer(
  actor: { role: AppRole; userId: string },
  target: { userId: string | null; userRole: AppRole | null },
): boolean {
  if (target.userRole === "owner") {
    return false;
  }
  const self = Boolean(target.userId && target.userId === actor.userId);
  if (self) {
    return true;
  }
  if (actor.role !== "owner" && actor.role !== "reception") {
    return false;
  }
  return target.userRole === null || target.userRole === "player";
}
