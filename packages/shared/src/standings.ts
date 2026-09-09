export type ScoredMatch = {
  pairA: [string, string];
  pairB: [string, string];
  scoreA: number | null;
  scoreB: number | null;
};

export type StandingRow = {
  playerId: string;
  name: string;
  points: number;
  wins: number;
  played: number;
};

export function standingsFromMatches(
  players: Array<{ id: string; name: string }>,
  matches: ScoredMatch[],
): StandingRow[] {
  const rows = new Map<string, StandingRow>(
    players.map((player) => [
      player.id,
      { playerId: player.id, name: player.name, points: 0, wins: 0, played: 0 },
    ]),
  );
  for (const match of matches) {
    if (match.scoreA === null || match.scoreB === null) {
      continue;
    }
    const award = (ids: [string, string], points: number, won: boolean) => {
      for (const id of ids) {
        const row = rows.get(id);
        if (!row) {
          continue;
        }
        row.points += points;
        row.played += 1;
        if (won) {
          row.wins += 1;
        }
      }
    };
    award(match.pairA, match.scoreA, match.scoreA > match.scoreB);
    award(match.pairB, match.scoreB, match.scoreB > match.scoreA);
  }
  return [...rows.values()].sort((left, right) => {
    if (right.points !== left.points) {
      return right.points - left.points;
    }
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }
    return left.name.localeCompare(right.name);
  });
}
