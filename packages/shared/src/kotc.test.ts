import assert from "node:assert/strict";
import { test } from "node:test";
import type { BracketTeam } from "./bracket.js";
import {
  KotcError,
  kotcCourtKind,
  losingPair,
  nextKotcRound,
  replacePlayerInKotc,
  seedKotcCourts,
  splitKotcBench,
  winningPair,
} from "./kotc.js";

function team(id: string): BracketTeam {
  return { playerIds: [id, `${id}b`], names: [id, `${id}b`] };
}

function scored(
  courtIndex: number,
  pairA: BracketTeam,
  pairB: BracketTeam,
  scoreA: number,
  scoreB: number,
) {
  return { courtIndex, pairA, pairB, scoreA, scoreB };
}

function courtIds(match: { pairA: BracketTeam; pairB: BracketTeam } | undefined): string[] {
  return [match?.pairA.playerIds[0], match?.pairB.playerIds[0]].filter(
    (id): id is string => Boolean(id),
  );
}

test("strongest pairs open on King, leftover pair waits", () => {
  const seeded = seedKotcCourts(["a", "b", "c", "d", "e"].map(team));
  assert.equal(seeded.matches.length, 2);
  assert.deepEqual(seeded.matches[0]?.pairA.playerIds[0], "a");
  assert.deepEqual(seeded.matches[0]?.pairB.playerIds[0], "b");
  assert.deepEqual(seeded.matches[1]?.pairA.playerIds[0], "c");
  assert.deepEqual(seeded.leftoverTeams[0]?.playerIds[0], "e");
});

test("two teams is one King court", () => {
  const seeded = seedKotcCourts(["a", "b"].map(team));
  assert.equal(seeded.matches.length, 1);
  assert.equal(seeded.leftoverTeams.length, 0);
});

test("fewer than two pairs is not KOTC", () => {
  assert.throws(() => seedKotcCourts([team("a")]), (error: unknown) => {
    return error instanceof KotcError && error.code === "kotc_need_four";
  });
});

test("a draw has no winner", () => {
  assert.throws(
    () => winningPair(scored(0, team("a"), team("b"), 4, 4)),
    (error: unknown) => error instanceof KotcError && error.code === "kotc_draw",
  );
});

test("one court: winners stay, waiting pair comes on", () => {
  const king = scored(0, team("a"), team("b"), 5, 2);
  const next = nextKotcRound([king], [team("c")]);
  assert.equal(next.matches.length, 1);
  assert.deepEqual(next.matches[0]?.pairA.playerIds[0], winningPair(king).playerIds[0]);
  assert.deepEqual(next.matches[0]?.pairB.playerIds[0], "c");
  assert.deepEqual(next.leftoverTeams[0]?.playerIds[0], losingPair(king).playerIds[0]);
});

test("one court with nobody waiting keeps the same two pairs", () => {
  const king = scored(0, team("a"), team("b"), 5, 3);
  const next = nextKotcRound([king]);
  assert.deepEqual(next.matches[0]?.pairA.playerIds[0], "a");
  assert.deepEqual(next.matches[0]?.pairB.playerIds[0], "b");
});

test("two courts: Queen winners go to King, King losers go to Queen", () => {
  const next = nextKotcRound([
    scored(0, team("k1"), team("k2"), 5, 3),
    scored(1, team("q1"), team("q2"), 4, 5),
  ]);
  assert.equal(next.matches.length, 2);
  assert.deepEqual(courtIds(next.matches[0]).sort(), ["k1", "q2"]);
  assert.deepEqual(courtIds(next.matches[1]).sort(), ["k2", "q1"]);
});

test("three courts move one step and a waiting pair replaces the lowest losers", () => {
  const next = nextKotcRound(
    [
      scored(0, team("a"), team("b"), 5, 1),
      scored(1, team("c"), team("d"), 5, 2),
      scored(2, team("e"), team("f"), 3, 5),
    ],
    [team("w")],
  );
  assert.deepEqual(courtIds(next.matches[0]).sort(), ["a", "c"]);
  assert.deepEqual(courtIds(next.matches[1]).sort(), ["b", "f"]);
  assert.deepEqual(courtIds(next.matches[2]).sort(), ["d", "w"]);
  assert.deepEqual(next.leftoverTeams[0]?.playerIds[0], "e");
});

test("bench of three becomes one challenger pair plus one sit-out", () => {
  const bench = splitKotcBench(
    [
      { id: "c", name: "C" },
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ],
    false,
  );
  assert.equal(bench.teams.length, 1);
  assert.deepEqual(bench.teams[0]?.playerIds, ["a", "b"]);
  assert.equal(bench.singleton?.id, "c");
});

test("mixed bench only pairs a man with a woman", () => {
  const bench = splitKotcBench(
    [
      { id: "m1", name: "M1", gender: "male" },
      { id: "m2", name: "M2", gender: "male" },
      { id: "w1", name: "W1", gender: "female" },
    ],
    true,
  );
  assert.equal(bench.teams.length, 1);
  assert.deepEqual(bench.teams[0]?.playerIds, ["m1", "w1"]);
  assert.equal(bench.singleton?.id, "m2");
});

test("sit-out swap replaces that player in the next courts", () => {
  const swapped = replacePlayerInKotc(
    [{ courtIndex: 0, pairA: team("a"), pairB: team("b") }],
    { id: "x", name: "X" },
    "bb",
  );
  assert.deepEqual(swapped[0]?.pairB.playerIds, ["b", "x"]);
  assert.deepEqual(swapped[0]?.pairB.names, ["b", "X"]);
});

test("court 0 is King and court 1 is Queen", () => {
  assert.equal(kotcCourtKind(0), "king");
  assert.equal(kotcCourtKind(1), "queen");
  assert.equal(kotcCourtKind(2), "numbered");
});
