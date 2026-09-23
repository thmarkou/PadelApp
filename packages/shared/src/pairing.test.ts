import assert from "node:assert/strict";
import { test } from "node:test";
import {
  applyOverride,
  canOverridePairing,
  canProposePairing,
  cyclePairing,
  pairAmericano,
  pairForCategory,
  pairMixedDoubles,
  pairPlayers,
  serializeMatch,
  sortForPairing,
  swapIncomingForPlayer,
} from "./pairing.js";

function p(id: string, level: number | null, standingPoints?: number) {
  return { id, name: id, level, standingPoints };
}

test("snake pairs 1+N vs 2+(N-1)", () => {
  const result = pairPlayers([p("a", 5), p("b", 4), p("c", 3), p("d", 2)], { algorithm: "snake" });
  assert.equal(result.overridden, false);
  assert.deepEqual(result.matches[0]?.pairA.playerIds, ["a", "d"]);
  assert.deepEqual(result.matches[0]?.pairB.playerIds, ["b", "c"]);
  assert.equal(result.matches[0]?.pairA.sum, 7);
  assert.equal(result.matches[0]?.pairB.sum, 7);
});

test("snake chunks eight players onto two courts", () => {
  const result = pairPlayers(
    [p("1", 8), p("2", 7), p("3", 6), p("4", 5), p("5", 4), p("6", 3), p("7", 2), p("8", 1)],
    { algorithm: "snake" },
  );
  assert.equal(result.matches.length, 2);
  assert.deepEqual(result.matches[0]?.pairA.playerIds, ["1", "4"]);
  assert.deepEqual(result.matches[1]?.pairA.playerIds, ["5", "8"]);
  assert.deepEqual(result.leftover, []);
});

test("snake keeps a leftover when count is not a multiple of four", () => {
  const result = pairPlayers([p("a", 5), p("b", 4), p("c", 3), p("d", 2), p("e", 1)], {
    algorithm: "snake",
  });
  assert.equal(result.matches.length, 1);
  assert.deepEqual(result.leftover, [{ id: "e", name: "e" }]);
});

test("snake puts missing levels last", () => {
  const sorted = sortForPairing([p("x", null), p("a", 4), p("b", 3)], "snake");
  assert.deepEqual(
    sorted.map((player) => player.id),
    ["a", "b", "x"],
  );
});

test("mexicano without points matches snake", () => {
  const players = [p("a", 5), p("b", 4), p("c", 3), p("d", 2)];
  const snake = pairPlayers(players, { algorithm: "snake" });
  const mexicano = pairPlayers(players, { algorithm: "mexicano" });
  assert.equal(serializeMatch(snake.matches[0]!), serializeMatch(mexicano.matches[0]!));
});

test("desk picks which pair the leftover joins", () => {
  const last = [{ pairA: ["a", "b"] as [string, string], pairB: ["c", "d"] as [string, string] }];
  const next = swapIncomingForPlayer(last, "e", "a");
  assert.deepEqual(next, [{ pairA: ["e", "b"], pairB: ["c", "d"] }]);
  const result = pairPlayers(
    [p("a", 3), p("b", 3), p("c", 3), p("d", 3), p("e", 3)],
    { algorithm: "mexicano", override: next },
  );
  assert.deepEqual(result.matches[0]?.pairA.playerIds, ["e", "b"]);
  assert.deepEqual(result.matches[0]?.pairB.playerIds, ["c", "d"]);
  assert.deepEqual(result.leftover, [{ id: "a", name: "a" }]);
});

test("americano second round avoids the same partners", () => {
  const players = [p("a", 4), p("b", 4), p("c", 3), p("d", 3), p("e", 2), p("f", 2), p("g", 1), p("h", 1)];
  const first = pairAmericano(players);
  const prior: Array<[string, string]> = first.matches.flatMap((match) => [
    match.pairA.playerIds,
    match.pairB.playerIds,
  ]);
  const second = pairAmericano(players, { priorPartnerPairs: prior });
  const firstKeys = new Set(prior.map(([left, right]) => [left, right].sort().join("+")));
  for (const match of second.matches) {
    assert.equal(firstKeys.has([...match.pairA.playerIds].sort().join("+")), false);
    assert.equal(firstKeys.has([...match.pairB.playerIds].sort().join("+")), false);
  }
});

test("next mexicano round brings last leftover back in", () => {
  const result = pairPlayers(
    [p("a", 3, 24), p("b", 3, 24), p("c", 3, 18), p("d", 3, 18), p("e", 3, 0)],
    { algorithm: "mexicano", mustPlayIds: ["e"] },
  );
  const playing = result.matches.flatMap((match) => [...match.pairA.playerIds, ...match.pairB.playerIds]);
  assert.ok(playing.includes("e"));
  assert.equal(result.leftover.some((item) => item.id === "e"), false);
});

test("mexicano uses live standings before rating", () => {
  const result = pairPlayers(
    [p("low", 2, 12), p("mid", 4, 8), p("high", 6, 8), p("sit", 5, 1)],
    { algorithm: "mexicano" },
  );
  assert.deepEqual(result.matches[0]?.pairA.playerIds, ["low", "sit"]);
  assert.deepEqual(result.matches[0]?.pairB.playerIds, ["high", "mid"]);
});

test("override keeps the given partners", () => {
  const players = [p("a", 5), p("b", 4), p("c", 3), p("d", 2)];
  const result = applyOverride(players, "snake", [{ pairA: ["a", "b"], pairB: ["c", "d"] }]);
  assert.equal(result.overridden, true);
  assert.deepEqual(result.matches[0]?.pairA.playerIds, ["a", "b"]);
  assert.equal(result.matches[0]?.pairA.sum, 9);
});

test("cycle walks the three unique foursomes", () => {
  const players = [p("a", 5), p("b", 4), p("c", 3), p("d", 2)];
  const first = pairPlayers(players, { algorithm: "snake" });
  const second = cyclePairing(players, first);
  const third = cyclePairing(players, second);
  const back = cyclePairing(players, third);
  const keys = [first, second, third].map((item) => serializeMatch(item.matches[0]!));
  assert.equal(new Set(keys).size, 3);
  assert.equal(serializeMatch(back.matches[0]!), serializeMatch(first.matches[0]!));
  assert.equal(second.overridden, true);
});

test("mixed doubles is man+woman vs man+woman", () => {
  const result = pairMixedDoubles(
    [
      { id: "m1", name: "m1", level: 5, gender: "male" },
      { id: "m2", name: "m2", level: 3, gender: "male" },
      { id: "w1", name: "w1", level: 4, gender: "female" },
      { id: "w2", name: "w2", level: 2, gender: "female" },
    ],
    "snake",
  );
  assert.equal(result.matches.length, 1);
  const match = result.matches[0];
  assert.ok(match);
  for (const pair of [match.pairA, match.pairB]) {
    const genders = pair.playerIds.map((id) =>
      id.startsWith("m") ? "male" : "female",
    );
    assert.ok(genders.includes("male") && genders.includes("female"));
  }
});

test("mixed leftover comes back in without breaking man+woman pairs", () => {
  const result = pairForCategory(
    [
      { id: "m1", name: "m1", level: 4, gender: "male", standingPoints: 24 },
      { id: "m2", name: "m2", level: 4, gender: "male", standingPoints: 18 },
      { id: "m3", name: "m3", level: 3, gender: "male", standingPoints: 0 },
      { id: "w1", name: "w1", level: 3, gender: "female", standingPoints: 24 },
      { id: "w2", name: "w2", level: 3, gender: "female", standingPoints: 18 },
    ],
    { algorithm: "mexicano", mixedDoubles: true, mustPlayIds: ["m3"] },
  );
  const playing = result.matches.flatMap((match) => [...match.pairA.playerIds, ...match.pairB.playerIds]);
  assert.ok(playing.includes("m3"));
  assert.equal(result.leftover.some((item) => item.id === "m3"), false);
  const match = result.matches[0];
  assert.ok(match);
  for (const pair of [match.pairA, match.pairB]) {
    const genders = pair.playerIds.map((id) => (id.startsWith("m") ? "male" : "female"));
    assert.ok(genders.includes("male") && genders.includes("female"));
  }
});

test("staff roles can propose; only desk can override", () => {
  assert.equal(canProposePairing("coach"), true);
  assert.equal(canProposePairing("player"), false);
  assert.equal(canOverridePairing("owner", true), true);
  assert.equal(canOverridePairing("coach", true), false);
  assert.equal(canOverridePairing("owner", false), false);
});
