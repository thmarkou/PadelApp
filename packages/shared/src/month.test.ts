import assert from "node:assert/strict";
import { test } from "node:test";
import { addMonths, monthCells, monthKeyFromIso, monthRange } from "./month.js";

test("month helpers walk ISO months and Monday-first grids", () => {
  assert.equal(monthKeyFromIso("2026-09-23"), "2026-09");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.deepEqual(monthRange("2026-09"), { start: "2026-09-01", end: "2026-09-30" });
  const cells = monthCells("2026-09");
  assert.equal(cells[0]?.date, "2026-08-31");
  assert.equal(cells[0]?.inMonth, false);
  assert.equal(cells[1]?.date, "2026-09-01");
  assert.equal(cells.at(-1)?.date, "2026-10-04");
  assert.equal(cells.length % 7, 0);
});
