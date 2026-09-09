export function isOpenMatch(openSpots: number, allowedMissing: ReadonlyArray<1 | 2>): boolean {
  return allowedMissing.some((missing) => missing === openSpots);
}

export function matchLevel(levels: Array<number | null>): number | null {
  const known = levels.filter((value): value is number => value !== null);
  if (known.length === 0) {
    return null;
  }
  return Number((known.reduce((sum, value) => sum + value, 0) / known.length).toFixed(2));
}

export function isWithinLevelDelta(
  playerLevel: number | null,
  matchAvg: number | null,
  delta: number,
): boolean {
  if (matchAvg === null) {
    return true;
  }
  if (playerLevel === null) {
    return false;
  }
  return Math.abs(playerLevel - matchAvg) <= delta + 1e-9;
}
