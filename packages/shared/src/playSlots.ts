export const MAX_TOURNAMENT_AVAILABLE_SLOTS = 8;

export type PlayWindow = { start: string; end: string };

export type TournamentPlaySlot = {
  id: string;
  playDate: string;
  start: string;
  end: string;
  sortOrder: number;
};

export type PlaySlotDraft = {
  playDate: string;
  start: string;
  end: string;
};

const TIME = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function isPlayTime(value: string): boolean {
  return TIME.test(value);
}

export const WEEKDAY_PLAY_WINDOWS: PlayWindow[] = [
  { start: "17:00", end: "19:15" },
  { start: "19:15", end: "21:30" },
  { start: "21:30", end: "23:45" },
];

export const WEEKEND_PLAY_WINDOWS: PlayWindow[] = [
  { start: "09:00", end: "11:00" },
  { start: "11:00", end: "13:15" },
  { start: "13:15", end: "15:30" },
  { start: "15:30", end: "17:30" },
  { start: "17:30", end: "19:45" },
  { start: "19:45", end: "22:00" },
  { start: "22:00", end: "00:00" },
];

export function isWeekendIso(date: string): boolean {
  const day = new Date(`${date}T12:00:00Z`).getUTCDay();
  return day === 0 || day === 6;
}

export function defaultWindowsForDate(date: string): PlayWindow[] {
  return isWeekendIso(date) ? WEEKEND_PLAY_WINDOWS : WEEKDAY_PLAY_WINDOWS;
}

export function expandPlayDates(dates: string[]): PlaySlotDraft[] {
  const unique = [...new Set(dates.filter((item) => /^\d{4}-\d{2}-\d{2}$/.test(item)))].sort();
  const drafts: PlaySlotDraft[] = [];
  for (const playDate of unique) {
    for (const window of defaultWindowsForDate(playDate)) {
      drafts.push({ playDate, start: window.start, end: window.end });
    }
  }
  return drafts;
}

export function groupSlotsByDate<T extends { playDate: string }>(
  slots: T[],
): Array<{ date: string; slots: T[] }> {
  const map = new Map<string, T[]>();
  for (const slot of slots) {
    const list = map.get(slot.playDate) ?? [];
    list.push(slot);
    map.set(slot.playDate, list);
  }
  return [...map.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([date, items]) => ({ date, slots: items }));
}

export function toggleAvailable(ids: string[], slotId: string): string[] {
  if (ids.includes(slotId)) {
    return ids.filter((id) => id !== slotId);
  }
  if (ids.length >= MAX_TOURNAMENT_AVAILABLE_SLOTS) {
    return ids;
  }
  return [...ids, slotId];
}

export function parseAvailable(
  availableAll: boolean,
  slotIds: string[],
): { ok: true; ids: string[] } | { ok: false; reason: "too_many" | "need_choice" } {
  if (availableAll) {
    return { ok: true, ids: [] };
  }
  const unique = [...new Set(slotIds)];
  if (unique.length === 0) {
    return { ok: false, reason: "need_choice" };
  }
  if (unique.length > MAX_TOURNAMENT_AVAILABLE_SLOTS) {
    return { ok: false, reason: "too_many" };
  }
  return { ok: true, ids: unique };
}
