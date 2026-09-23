export type GeneratedSlot = {
  startsAt: string;
  durationMinutes: number;
};

/** Club timetable. Match length (60 / 90 / 120) is separate — it does not reshape the grid. */
export const CLUB_DAY_START = "09:30";
export const CLUB_DAY_END = "23:00";
export const CLUB_GRID_MINUTES = 30;

export function parseMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.slice(0, 5).split(":").map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time: ${hhmm}`);
  }
  return hours * 60 + minutes;
}

function toIso(date: string, minutesFromMidnight: number): string {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  return `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function alignUp(minutes: number, origin: number, step: number): number {
  if (minutes <= origin) {
    return origin;
  }
  const remainder = (minutes - origin) % step;
  return remainder === 0 ? minutes : minutes + (step - remainder);
}

export function timeFromStamp(value: string): string {
  const match = value.match(/T(\d{2}:\d{2})/);
  return match?.[1] ?? value.slice(0, 5);
}

export function rangesOverlap(
  aStart: string,
  aMinutes: number,
  bStart: string,
  bMinutes: number,
): boolean {
  const a0 = parseMinutes(timeFromStamp(aStart));
  const b0 = parseMinutes(timeFromStamp(bStart));
  return a0 < b0 + bMinutes && b0 < a0 + aMinutes;
}

export function bookingDisplayKind(spotCount: number): "held" | "open" | "full" {
  if (spotCount <= 0) {
    return "held";
  }
  if (spotCount < 4) {
    return "open";
  }
  return "full";
}

export function generateDaySlots(input: {
  date: string;
  openTime: string;
  closeTime: string;
}): GeneratedSlot[] {
  const courtOpen = parseMinutes(input.openTime);
  const courtClose = parseMinutes(input.closeTime);
  const dayOpen = parseMinutes(CLUB_DAY_START);
  const dayClose = parseMinutes(CLUB_DAY_END);
  const start = alignUp(Math.max(courtOpen, dayOpen), dayOpen, CLUB_GRID_MINUTES);
  const end = Math.min(courtClose, dayClose);
  if (end <= start) {
    return [];
  }

  const slots: GeneratedSlot[] = [];
  for (let cursor = start; cursor + CLUB_GRID_MINUTES <= end; cursor += CLUB_GRID_MINUTES) {
    slots.push({
      startsAt: toIso(input.date, cursor),
      durationMinutes: CLUB_GRID_MINUTES,
    });
  }
  return slots;
}

export function bookingFitsDay(startsAt: string, durationMinutes: number, closeTime: string): boolean {
  const start = parseMinutes(timeFromStamp(startsAt));
  const close = Math.min(parseMinutes(closeTime), parseMinutes(CLUB_DAY_END));
  return start + durationMinutes <= close;
}
