import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_TOURNAMENT_AVAILABLE_SLOTS,
  defaultWindowsForDate,
  expandPlayDates,
  parseAvailable,
  toggleAvailable,
} from "./playSlots.js";

test("uses evening windows on a weekday and full day on a weekend", () => {
  assert.deepEqual(
    defaultWindowsForDate("2026-10-08").map((item) => item.start),
    ["17:00", "19:15", "21:30"],
  );
  assert.equal(defaultWindowsForDate("2026-10-10").length, 7);
});

test("expands dates into the club grid", () => {
  assert.equal(expandPlayDates(["2026-10-09", "2026-10-08"]).length, 6);
});

test("caps chosen hours at 8", () => {
  assert.deepEqual(parseAvailable(true, ["a"]), { ok: true, ids: [] });
  const empty = parseAvailable(false, []);
  assert.equal(empty.ok, false);
  if (!empty.ok) {
    assert.equal(empty.reason, "need_choice");
  }
  const two = parseAvailable(false, ["a", "b"]);
  assert.equal(two.ok, true);
  if (two.ok) {
    assert.deepEqual(two.ids, ["a", "b"]);
  }
  const nine = Array.from({ length: MAX_TOURNAMENT_AVAILABLE_SLOTS + 1 }, (_, index) => String(index));
  assert.equal(parseAvailable(false, nine).ok, false);
});

test("toggles a chosen slot and stops at the cap", () => {
  assert.deepEqual(toggleAvailable(["a"], "a"), []);
  assert.deepEqual(toggleAvailable(["a"], "b"), ["a", "b"]);
  const full = Array.from({ length: MAX_TOURNAMENT_AVAILABLE_SLOTS }, (_, index) => String(index));
  assert.deepEqual(toggleAvailable(full, "x"), full);
});
