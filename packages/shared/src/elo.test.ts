import assert from "node:assert/strict";
import { test } from "node:test";
import { nextLevelsAfterMatch } from "./elo.js";

const even = {
  teamA: [
    { id: "a1", level: 3.0 },
    { id: "a2", level: 3.0 },
  ],
  teamB: [
    { id: "b1", level: 3.0 },
    { id: "b2", level: 3.0 },
  ],
  k: 24,
  min: 1.0,
  max: 7.0,
  step: 0.1,
};

function levelOf(rows: Array<{ id: string; level: number }>, id: string): number {
  const row = rows.find((item) => item.id === id);
  assert.ok(row);
  return row.level;
}

test("equal pairs: winners move up one step, losers down one", () => {
  const next = nextLevelsAfterMatch({ ...even, scoreA: 24, scoreB: 18 });
  assert.equal(levelOf(next, "a1"), 3.1);
  assert.equal(levelOf(next, "a2"), 3.1);
  assert.equal(levelOf(next, "b1"), 2.9);
  assert.equal(levelOf(next, "b2"), 2.9);
});

test("equal pairs drawing do not move", () => {
  const next = nextLevelsAfterMatch({ ...even, scoreA: 12, scoreB: 12 });
  assert.equal(levelOf(next, "a1"), 3.0);
  assert.equal(levelOf(next, "b1"), 3.0);
});

test("an upset moves ratings more than a favourite win", () => {
  const base = { k: 24, min: 1.0, max: 7.0, step: 0.1 };
  const favouriteWin = nextLevelsAfterMatch({
    ...base,
    teamA: [{ id: "strong", level: 5.0 }],
    teamB: [{ id: "weak", level: 2.0 }],
    scoreA: 24,
    scoreB: 10,
  });
  const upset = nextLevelsAfterMatch({
    ...base,
    teamA: [{ id: "weak", level: 2.0 }],
    teamB: [{ id: "strong", level: 5.0 }],
    scoreA: 24,
    scoreB: 10,
  });
  const favouriteGain = levelOf(favouriteWin, "strong") - 5.0;
  const upsetGain = levelOf(upset, "weak") - 2.0;
  assert.ok(upsetGain > favouriteGain);
  assert.ok(upsetGain >= 0.2);
});

test("levels stay inside the club scale", () => {
  const next = nextLevelsAfterMatch({
    teamA: [{ id: "floor", level: 1.0 }],
    teamB: [{ id: "other", level: 1.0 }],
    scoreA: 0,
    scoreB: 24,
    k: 24,
    min: 1.0,
    max: 7.0,
    step: 0.1,
  });
  assert.equal(levelOf(next, "floor"), 1.0);
});

test("skip Elo when a side has no rated player", () => {
  const next = nextLevelsAfterMatch({
    ...even,
    teamA: [],
    scoreA: 24,
    scoreB: 18,
  });
  assert.deepEqual(next, []);
});
