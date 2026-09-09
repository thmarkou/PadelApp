import assert from "node:assert/strict";
import { test } from "node:test";
import { eligibleForCategory, isMixedDoublesPair, playerAge } from "./categories.js";
import type { TournamentCategoryRule } from "./types.js";

const on = new Date("2026-09-10T00:00:00Z");

function player(input: {
  gender?: "male" | "female" | null;
  birthYear?: number | null;
  self?: number | null;
  confirmed?: number | null;
}) {
  return {
    gender: input.gender ?? null,
    birthYear: input.birthYear ?? null,
    selfLevel: input.self ?? null,
    confirmedLevel: input.confirmed ?? null,
  };
}

const womenU16: TournamentCategoryRule = {
  gender: "women",
  minAge: null,
  maxAge: 16,
  minLevel: null,
  maxLevel: null,
};

test("age is year minus birth year", () => {
  assert.equal(playerAge(2012, on), 14);
  assert.equal(playerAge(null, on), null);
});

test("women category rejects men and missing gender", () => {
  assert.equal(eligibleForCategory(player({ gender: "female", birthYear: 2012 }), womenU16, on).ok, true);
  assert.equal(eligibleForCategory(player({ gender: "male", birthYear: 2012 }), womenU16, on).reason, "gender_mismatch");
  assert.equal(eligibleForCategory(player({ birthYear: 2012 }), womenU16, on).reason, "gender_missing");
});

test("age cap rejects adults and missing year", () => {
  assert.equal(eligibleForCategory(player({ gender: "female", birthYear: 2000 }), womenU16, on).reason, "age_mismatch");
  assert.equal(eligibleForCategory(player({ gender: "female" }), womenU16, on).reason, "age_missing");
});

test("mixed doubles pair is one man and one woman", () => {
  assert.equal(isMixedDoublesPair("male", "female"), true);
  assert.equal(isMixedDoublesPair("male", "male"), false);
  assert.equal(isMixedDoublesPair("male", null), false);
});

test("level band uses confirmed then self", () => {
  const band: TournamentCategoryRule = {
    gender: "men",
    minAge: null,
    maxAge: null,
    minLevel: 3,
    maxLevel: 4.9,
  };
  assert.equal(eligibleForCategory(player({ gender: "male", confirmed: 3.2 }), band, on).ok, true);
  assert.equal(eligibleForCategory(player({ gender: "male", self: 5.5 }), band, on).reason, "level_mismatch");
});
