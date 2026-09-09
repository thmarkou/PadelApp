export type GeneratedSlot = {
  startsAt: string;
  durationMinutes: number;
};

function parseMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  if (hours === undefined || minutes === undefined || Number.isNaN(hours) || Number.isNaN(minutes)) {
    throw new Error(`Invalid time: ${hhmm}`);
  }
  return hours * 60 + minutes;
}

function toIso(date: string, minutesFromMidnight: number): string {
  const hours = Math.floor(minutesFromMidnight / 60);
  const minutes = minutesFromMidnight % 60;
  const stamp = `${date}T${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
  return stamp;
}

/** Builds bookable slots from club settings + a court's opening hours. Nothing is hardcoded to 90′. */
export function generateDaySlots(input: {
  date: string;
  openTime: string;
  closeTime: string;
  durationMinutes: number;
  bufferMinutes: number;
}): GeneratedSlot[] {
  const start = parseMinutes(input.openTime.slice(0, 5));
  const end = parseMinutes(input.closeTime.slice(0, 5));
  const step = input.durationMinutes + input.bufferMinutes;
  if (step <= 0 || end <= start) {
    return [];
  }

  const slots: GeneratedSlot[] = [];
  for (let cursor = start; cursor + input.durationMinutes <= end; cursor += step) {
    slots.push({
      startsAt: toIso(input.date, cursor),
      durationMinutes: input.durationMinutes,
    });
  }
  return slots;
}
