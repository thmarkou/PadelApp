import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formBracketTeams,
  nextKnockoutRound,
  seedFirstRound,
  seedSlots,
  winningTeam,
} from "./bracket.js";
import type { PairingPlayerInput } from "./pairing.js";

function p(id: string, level: number, gender: "male" | "female" = "male"): PairingPlayerInput {
  return { id, name: id.toUpperCase(), level, gender };
}

test("seed slots keep 1 and 2 in opposite halves", () => {
  assert.deepEqual(seedSlots(8), [1, 8, 4, 5, 2, 7, 3, 6]);
  const eight = seedFirstRound(["a", "b", "c", "d", "e", "f", "g", "h"].map((id) => ({
    playerIds: [id, `${id}2`] as [string, string],
    names: [id, `${id}2`] as [string, string],
  })));
  assert.equal(eight.length, 4);
  assert.deepEqual(eight[0]?.pairA.playerIds[0], "a");
  assert.deepEqual(eight[0]?.pairB?.playerIds[0], "h");
  assert.deepEqual(eight[1]?.pairA.playerIds[0], "d");
  assert.deepEqual(eight[1]?.pairB?.playerIds[0], "e");
});

test("five teams: seeds 1–3 get a bye, 4 plays 5", () => {
  const teams = ["a", "b", "c", "d", "e"].map((id) => ({
    playerIds: [id, `${id}2`] as [string, string],
    names: [id, `${id}2`] as [string, string],
  }));
  const first = seedFirstRound(teams);
  assert.equal(first.length, 4);
  assert.equal(first[0]?.pairB, null);
  assert.equal(first[0]?.pairA.playerIds[0], "a");
  assert.equal(first[1]?.pairA.playerIds[0], "d");
  assert.equal(first[1]?.pairB?.playerIds[0], "e");
  assert.equal(first[2]?.pairB, null);
  assert.equal(first[2]?.pairA.playerIds[0], "b");
  assert.equal(first[3]?.pairB, null);
  assert.equal(first[3]?.pairA.playerIds[0], "c");
});

test("winners stay in halves so 1 does not meet 2 before the final", () => {
  const first = seedFirstRound(
    ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8"].map((id) => ({
      playerIds: [id, `${id}b`] as [string, string],
      names: [id, `${id}b`] as [string, string],
    })),
  );
  const winners = first.map((match) =>
    winningTeam({
      pairA: match.pairA,
      pairB: match.pairB,
      scoreA: match.pairB ? 6 : null,
      scoreB: match.pairB ? 3 : null,
    }),
  );
  const semis = nextKnockoutRound(winners);
  assert.equal(semis.length, 2);
  assert.equal(semis[0]?.pairA.playerIds[0], "s1");
  assert.equal(semis[0]?.pairB?.playerIds[0], "s4");
  assert.equal(semis[1]?.pairA.playerIds[0], "s2");
  assert.equal(semis[1]?.pairB?.playerIds[0], "s3");
  const finalists = nextKnockoutRound(semis.map((match) => match.pairA));
  assert.equal(finalists.length, 1);
  assert.equal(finalists[0]?.pairA.playerIds[0], "s1");
  assert.equal(finalists[0]?.pairB?.playerIds[0], "s2");
});

test("form teams snake-pairs and leaves an odd player out", () => {
  const formed = formBracketTeams([p("a", 5), p("b", 4), p("c", 3), p("d", 2), p("e", 1)], false);
  assert.equal(formed.teams.length, 2);
  assert.deepEqual(formed.leftover.map((row) => row.id), ["e"]);
  assert.deepEqual(formed.teams[0]?.playerIds, ["a", "d"]);
  assert.deepEqual(formed.teams[1]?.playerIds, ["b", "c"]);
});

test("mixed knockout teams are man plus woman", () => {
  const formed = formBracketTeams(
    [
      p("m1", 5, "male"),
      p("m2", 3, "male"),
      p("w1", 4, "female"),
      p("w2", 2, "female"),
    ],
    true,
  );
  assert.equal(formed.leftover.length, 0);
  assert.equal(formed.teams.length, 2);
  for (const team of formed.teams) {
    const genders = team.playerIds.map((id) => (id.startsWith("m") ? "male" : "female"));
    assert.deepEqual(new Set(genders), new Set(["male", "female"]));
  }
});
