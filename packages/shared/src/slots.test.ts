import assert from "node:assert/strict";
import { test } from "node:test";
import {
  bookingDisplayKind,
  bookingFitsDay,
  generateDaySlots,
  rangesOverlap,
} from "./slots.js";

test("grid is 30 minutes from 09:30 to 23:00, not 60/90/120", () => {
  const slots = generateDaySlots({
    date: "2026-09-23",
    openTime: "08:00",
    closeTime: "23:00",
  });
  assert.equal(slots[0]?.startsAt, "2026-09-23T09:30:00");
  assert.equal(slots.at(-1)?.startsAt, "2026-09-23T22:30:00");
  assert.equal(slots.length, 27);
  assert.ok(slots.every((slot) => slot.durationMinutes === 30));
});

test("court that closes earlier clips the grid", () => {
  const slots = generateDaySlots({
    date: "2026-09-23",
    openTime: "09:00",
    closeTime: "21:00",
  });
  assert.equal(slots[0]?.startsAt, "2026-09-23T09:30:00");
  assert.equal(slots.at(-1)?.startsAt, "2026-09-23T20:30:00");
});

test("90 minute booking covers three 30 minute cells", () => {
  assert.equal(rangesOverlap("09:30", 30, "09:30", 90), true);
  assert.equal(rangesOverlap("10:00", 30, "09:30", 90), true);
  assert.equal(rangesOverlap("10:30", 30, "09:30", 90), true);
  assert.equal(rangesOverlap("11:00", 30, "09:30", 90), false);
});

test("booking must finish by close", () => {
  assert.equal(bookingFitsDay("2026-09-23T21:30:00", 90, "23:00"), true);
  assert.equal(bookingFitsDay("2026-09-23T22:00:00", 90, "23:00"), false);
});

test("empty foursome is held, not open", () => {
  assert.equal(bookingDisplayKind(0), "held");
  assert.equal(bookingDisplayKind(2), "open");
  assert.equal(bookingDisplayKind(4), "full");
});
