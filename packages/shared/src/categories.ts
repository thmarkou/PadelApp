import { playingLevel } from "./levels.js";
import type { PlayerGender, TournamentCategoryRule, TournamentGenderRule } from "./types.js";

export function playerAge(birthYear: number | null, on: Date = new Date()): number | null {
  if (birthYear === null || !Number.isInteger(birthYear)) {
    return null;
  }
  const age = on.getFullYear() - birthYear;
  return age >= 0 && age < 120 ? age : null;
}

export type CategoryEligibility = {
  ok: boolean;
  reason: "ok" | "gender_missing" | "gender_mismatch" | "age_missing" | "age_mismatch" | "level_missing" | "level_mismatch";
};

export function genderFitsRule(gender: PlayerGender | null, rule: TournamentGenderRule): CategoryEligibility {
  if (gender === null) {
    return { ok: false, reason: "gender_missing" };
  }
  if (rule === "men" && gender !== "male") {
    return { ok: false, reason: "gender_mismatch" };
  }
  if (rule === "women" && gender !== "female") {
    return { ok: false, reason: "gender_mismatch" };
  }
  return { ok: true, reason: "ok" };
}

export function eligibleForCategory(
  player: {
    gender: PlayerGender | null;
    birthYear: number | null;
    selfLevel: number | null;
    confirmedLevel: number | null;
  },
  rule: TournamentCategoryRule,
  on: Date = new Date(),
): CategoryEligibility {
  const gender = genderFitsRule(player.gender, rule.gender);
  if (!gender.ok) {
    return gender;
  }
  if (rule.minAge !== null || rule.maxAge !== null) {
    const age = playerAge(player.birthYear, on);
    if (age === null) {
      return { ok: false, reason: "age_missing" };
    }
    if ((rule.minAge !== null && age < rule.minAge) || (rule.maxAge !== null && age > rule.maxAge)) {
      return { ok: false, reason: "age_mismatch" };
    }
  }
  if (rule.minLevel !== null || rule.maxLevel !== null) {
    const level = playingLevel(player.selfLevel, player.confirmedLevel);
    if (level === null) {
      return { ok: false, reason: "level_missing" };
    }
    if ((rule.minLevel !== null && level < rule.minLevel) || (rule.maxLevel !== null && level > rule.maxLevel)) {
      return { ok: false, reason: "level_mismatch" };
    }
  }
  return { ok: true, reason: "ok" };
}

/** Mixed doubles: each pair must be one male and one female. */
export function isMixedDoublesPair(left: PlayerGender | null, right: PlayerGender | null): boolean {
  return (
    (left === "male" && right === "female") || (left === "female" && right === "male")
  );
}
