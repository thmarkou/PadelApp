export function todayIsoDate(): string {
  const now = new Date();
  return toIsoDate(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

export function addIsoDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const date = new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1);
  date.setDate(date.getDate() + days);
  return toIsoDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

function toIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function slotTimeLabel(startsAt: string): string {
  const match = startsAt.match(/T(\d{2}:\d{2})/) ?? startsAt.match(/ (\d{2}:\d{2})/);
  return match?.[1] ?? startsAt;
}

export function slotDateLabel(startsAt: string): string {
  const match = startsAt.match(/^(\d{4}-\d{2}-\d{2})/);
  return match?.[1] ?? startsAt;
}

export function formatDayHeading(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const tag = locale.startsWith("el") ? "el-GR" : "en-GB";
  return new Date(year ?? 1970, (month ?? 1) - 1, day ?? 1).toLocaleDateString(tag, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
