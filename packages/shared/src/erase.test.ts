import assert from "node:assert/strict";
import { test } from "node:test";
import { canErasePlayer } from "./erase.js";
import { standingsFromMatches } from "./standings.js";

test("cannot erase an owner; desk can erase a player account", () => {
  assert.equal(
    canErasePlayer({ role: "owner", userId: "o" }, { userId: "x", userRole: "owner" }),
    false,
  );
  assert.equal(
    canErasePlayer({ role: "owner", userId: "o" }, { userId: "p", userRole: "player" }),
    true,
  );
  assert.equal(
    canErasePlayer({ role: "coach", userId: "c" }, { userId: "p", userRole: "player" }),
    false,
  );
  assert.equal(
    canErasePlayer({ role: "player", userId: "p" }, { userId: "p", userRole: "player" }),
    true,
  );
  assert.equal(
    canErasePlayer({ role: "coach", userId: "c" }, { userId: "c", userRole: "coach" }),
    true,
  );
  assert.equal(
    canErasePlayer({ role: "owner", userId: "o" }, { userId: "o", userRole: "owner" }),
    false,
  );
});

test("standings add pair points to both partners", () => {
  const rows = standingsFromMatches(
    [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
      { id: "c", name: "C" },
      { id: "d", name: "D" },
    ],
    [{ pairA: ["a", "b"], pairB: ["c", "d"], scoreA: 24, scoreB: 18 }],
  );
  assert.equal(rows[0]?.playerId, "a");
  assert.equal(rows[0]?.points, 24);
  assert.equal(rows[0]?.wins, 1);
  assert.equal(rows.find((row) => row.playerId === "c")?.points, 18);
});
