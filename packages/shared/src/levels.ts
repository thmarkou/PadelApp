import type { AppRole, ConfirmRole, LevelBand } from "./types.js";

export function snapLevel(value: number, min: number, max: number, step: number): number {
  const clamped = Math.min(max, Math.max(min, value));
  if (step <= 0) {
    return clamped;
  }
  const steps = Math.round((clamped - min) / step);
  return Number((min + steps * step).toFixed(2));
}

export function bandForLevel(bands: LevelBand[], level: number | null): LevelBand | null {
  if (level === null) {
    return null;
  }
  return bands.find((band) => level >= band.min && level <= band.max) ?? null;
}

export function playingLevel(selfLevel: number | null, confirmedLevel: number | null): number | null {
  return confirmedLevel ?? selfLevel;
}

export function canConfirmPlayerLevel(role: AppRole, confirmRole: ConfirmRole): boolean {
  if (role === "owner") {
    return true;
  }
  if (confirmRole === "coach") {
    return role === "coach";
  }
  return role === "reception";
}

export function canManagePlayers(role: AppRole): boolean {
  return role === "owner" || role === "reception" || role === "coach";
}

/** Laptop desk and on-court tablet. Players stay in the mobile app. */
export function canAccessDesk(role: AppRole): boolean {
  return canManagePlayers(role);
}
