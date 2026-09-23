import assert from "node:assert/strict";
import { test } from "node:test";
import type { BracketTeam } from "./bracket.js";
import {
  fixtureKey,
  groupQualifiers,
  groupSizes,
  groupStageComplete,
  groupStandings,
  nextGroupMatchday,
  roundRobinRounds,
  snakeIntoGroups,
  splitIntoGroups,
} from "./groups.js";

function team(id: string): BracketTeam {
  return { playerIds: [id, `${id}b`], names: [id, `${id}b`] };
}

test("group sizes stay at 3–4 when possible", () => {
  assert.deepEqual(groupSizes(3), [3]);
  assert.deepEqual(groupSizes(4), [4]);
  assert.deepEqual(groupSizes(6), [3, 3]);
  assert.deepEqual(groupSizes(8), [4, 4]);
  assert.deepEqual(groupSizes(9), [3, 3, 3]);
  assert.deepEqual(groupSizes(10), [4, 3, 3]);
});

test("snake keeps seeds 1 and 2 in different groups", () => {
  const groups = snakeIntoGroups(["a", "b", "c", "d", "e", "f"].map(team), [3, 3]);
  assert.equal(groups[0]?.teams[0]?.playerIds[0], "a");
  assert.equal(groups[1]?.teams[0]?.playerIds[0], "b");
});

test("round robin of four teams is six unique matches over three days", () => {
  const teams = ["a", "b", "c", "d"].map(team);
  const days = roundRobinRounds(teams);
  assert.equal(days.length, 3);
  const keys = days.flatMap((day) => {
    assert.equal(day.length, 2);
    return day.map(([left, right]) => fixtureKey(left, right));
  });
  assert.equal(new Set(keys).size, 6);
});

test("three-team group has one match per day and a sit-out", () => {
  const days = roundRobinRounds(["a", "b", "c"].map(team));
  assert.equal(days.length, 3);
  assert.equal(days.every((day) => day.length === 1), true);
});

test("standings rank by wins then point difference", () => {
  const a = team("a");
  const b = team("b");
  const c = team("c");
  const table = groupStandings([a, b, c], [
    { pairA: a, pairB: b, scoreA: 6, scoreB: 3 },
    { pairA: a, pairB: c, scoreA: 6, scoreB: 4 },
    { pairA: b, pairB: c, scoreA: 6, scoreB: 2 },
  ]);
  assert.equal(table[0]?.team.playerIds[0], "a");
  assert.equal(table[0]?.wins, 2);
  assert.equal(table[1]?.team.playerIds[0], "b");
  assert.equal(table[2]?.team.playerIds[0], "c");
});

test("two groups send 1A 1B 2A 2B into the knockout", () => {
  const a1 = team("1a");
  const a2 = team("2a");
  const b1 = team("1b");
  const b2 = team("2b");
  const qualifiers = groupQualifiers([
    [
      { team: a1, played: 2, wins: 2, pointsFor: 12, pointsAgainst: 4 },
      { team: a2, played: 2, wins: 1, pointsFor: 8, pointsAgainst: 8 },
    ],
    [
      { team: b1, played: 2, wins: 2, pointsFor: 12, pointsAgainst: 5 },
      { team: b2, played: 2, wins: 0, pointsFor: 4, pointsAgainst: 12 },
    ],
  ]);
  assert.deepEqual(
    qualifiers.map((row) => row.playerIds[0]),
    ["1a", "1b", "2a", "2b"],
  );
});

test("next matchday skips fixtures already played", () => {
  const groups = splitIntoGroups(["a", "b", "c", "d"].map(team));
  const first = nextGroupMatchday(groups, new Set());
  assert.equal(first.length > 0, true);
  const played = new Set(first.map((match) => fixtureKey(match.pairA, match.pairB!)));
  const second = nextGroupMatchday(groups, played);
  assert.equal(second.every((match) => !played.has(fixtureKey(match.pairA, match.pairB!))), true);
  const more = new Set([...played, ...second.map((match) => fixtureKey(match.pairA, match.pairB!))]);
  const third = nextGroupMatchday(groups, more);
  const all = [...first, ...second, ...third];
  assert.equal(groupStageComplete(groups, new Set(all.map((match) => fixtureKey(match.pairA, match.pairB!)))), true);
});
