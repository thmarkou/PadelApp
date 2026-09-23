export function monthKeyFromIso(iso: string): string {
  return iso.slice(0, 7);
}

export function addMonths(monthKey: string, delta: number): string {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const date = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthRange(monthKey: string): { start: string; end: string } {
  const year = Number(monthKey.slice(0, 4));
  const month = Number(monthKey.slice(5, 7));
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    start: `${monthKey}-01`,
    end: `${monthKey}-${String(last).padStart(2, "0")}`,
  };
}

/** Monday-first cells covering the month, including leading/trailing days. */
export function monthCells(monthKey: string): Array<{ date: string; inMonth: boolean }> {
  const { start, end } = monthRange(monthKey);
  const first = new Date(`${start}T12:00:00Z`);
  const last = new Date(`${end}T12:00:00Z`);
  const mondayOffset = (first.getUTCDay() + 6) % 7;
  const cursor = new Date(first);
  cursor.setUTCDate(cursor.getUTCDate() - mondayOffset);
  const sundayPad = last.getUTCDay() === 0 ? 0 : 7 - last.getUTCDay();
  const stop = new Date(last);
  stop.setUTCDate(stop.getUTCDate() + sundayPad);
  const cells: Array<{ date: string; inMonth: boolean }> = [];
  while (cursor <= stop) {
    const date = cursor.toISOString().slice(0, 10);
    cells.push({ date, inMonth: date >= start && date <= end });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return cells;
}
