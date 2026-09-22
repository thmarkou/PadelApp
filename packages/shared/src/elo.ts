import { snapLevel } from "./levels.js";

export type RatedPlayer = {
  id: string;
  level: number;
};

const ELO_SCALE = 100;

function teamLevel(players: RatedPlayer[]): number {
  const total = players.reduce((sum, player) => sum + player.level, 0);
  return total / players.length;
}

function expectedScore(levelA: number, levelB: number): number {
  return 1 / (1 + 10 ** (((levelB - levelA) * ELO_SCALE) / 400));
}

function actualScore(scoreA: number, scoreB: number): number {
  if (scoreA === scoreB) {
    return 0.5;
  }
  return scoreA > scoreB ? 1 : 0;
}

/**
 * Club levels stay on the 1–7 scale. Elo runs on level×100 so `eloK` (8–64)
 * behaves like a classic K-factor. Same delta for both partners on a pair.
 * First scored result only — callers must not re-apply on a score edit.
 */
export function nextLevelsAfterMatch(input: {
  teamA: RatedPlayer[];
  teamB: RatedPlayer[];
  scoreA: number;
  scoreB: number;
  k: number;
  min: number;
  max: number;
  step: number;
}): Array<{ id: string; level: number }> {
  if (input.teamA.length === 0 || input.teamB.length === 0) {
    return [];
  }

  const expectedA = expectedScore(teamLevel(input.teamA), teamLevel(input.teamB));
  const deltaPoints = input.k * (actualScore(input.scoreA, input.scoreB) - expectedA);
  const shift = deltaPoints / ELO_SCALE;

  const next = (player: RatedPlayer, delta: number) => ({
    id: player.id,
    level: snapLevel(player.level + delta, input.min, input.max, input.step),
  });

  return [
    ...input.teamA.map((player) => next(player, shift)),
    ...input.teamB.map((player) => next(player, -shift)),
  ];
}
