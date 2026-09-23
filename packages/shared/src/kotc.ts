import type { PlayerGender } from "./types.js";
import type { BracketTeam } from "./bracket.js";

export class KotcError extends Error {
  constructor(
    readonly code: "kotc_need_four" | "kotc_draw" | "kotc_incomplete" | "kotc_unknown_player",
    message: string,
  ) {
    super(message);
  }
}

export type KotcMatchDraft = {
  courtIndex: number;
  pairA: BracketTeam;
  pairB: BracketTeam;
};

export type KotcCourtResult = KotcMatchDraft & {
  scoreA: number;
  scoreB: number;
};

export type KotcBenchPlayer = {
  id: string;
  name: string;
  gender?: PlayerGender | null;
};

function teamKey(team: BracketTeam): string {
  return [...team.playerIds].sort().join("+");
}

function byName(left: KotcBenchPlayer, right: KotcBenchPlayer): number {
  const names = left.name.localeCompare(right.name);
  return names !== 0 ? names : left.id.localeCompare(right.id);
}

function toTeam(left: KotcBenchPlayer, right: KotcBenchPlayer): BracketTeam {
  return {
    playerIds: [left.id, right.id],
    names: [left.name, right.name],
  };
}

/** Court 0 is King, 1 is Queen, the rest are numbered from 1. */
export function kotcCourtKind(index: number): "king" | "queen" | "numbered" {
  if (index === 0) {
    return "king";
  }
  if (index === 1) {
    return "queen";
  }
  return "numbered";
}

export function winningPair(result: KotcCourtResult): BracketTeam {
  if (result.scoreA === result.scoreB) {
    throw new KotcError("kotc_draw", "King of the Court cannot end in a draw");
  }
  return result.scoreA > result.scoreB ? result.pairA : result.pairB;
}

export function losingPair(result: KotcCourtResult): BracketTeam {
  return teamKey(winningPair(result)) === teamKey(result.pairA) ? result.pairB : result.pairA;
}

/** Strongest two pairs on King, next two on Queen, leftover pair waits. */
export function seedKotcCourts(teams: BracketTeam[]): {
  matches: KotcMatchDraft[];
  leftoverTeams: BracketTeam[];
} {
  if (teams.length < 2) {
    throw new KotcError("kotc_need_four", "King of the Court needs at least two pairs");
  }
  const courtCount = Math.floor(teams.length / 2);
  const matches: KotcMatchDraft[] = [];
  for (let index = 0; index < courtCount; index += 1) {
    const pairA = teams[index * 2];
    const pairB = teams[index * 2 + 1];
    if (!pairA || !pairB) {
      throw new KotcError("kotc_need_four", "King of the Court needs at least two pairs");
    }
    matches.push({ courtIndex: index, pairA, pairB });
  }
  return { matches, leftoverTeams: teams.slice(courtCount * 2) };
}

/**
 * Sitting players become challenger pairs (name order). One leftover sits
 * and the desk picks who they replace — same as Mexicano.
 */
export function splitKotcBench(
  players: KotcBenchPlayer[],
  mixedDoubles: boolean,
): { teams: BracketTeam[]; singleton: KotcBenchPlayer | null } {
  const sorted = [...players].sort(byName);
  const teams: BracketTeam[] = [];
  const unused: KotcBenchPlayer[] = [];
  if (mixedDoubles) {
    const men = sorted.filter((player) => player.gender === "male");
    const women = sorted.filter((player) => player.gender === "female");
    unused.push(...sorted.filter((player) => player.gender !== "male" && player.gender !== "female"));
    const pairs = Math.min(men.length, women.length);
    for (let index = 0; index < pairs; index += 1) {
      const man = men[index];
      const woman = women[index];
      if (man && woman) {
        teams.push(toTeam(man, woman));
      }
    }
    unused.push(...men.slice(pairs), ...women.slice(pairs));
  } else {
    let index = 0;
    while (index + 1 < sorted.length) {
      const left = sorted[index];
      const right = sorted[index + 1];
      if (left && right) {
        teams.push(toTeam(left, right));
      }
      index += 2;
    }
    unused.push(...sorted.slice(index));
  }
  unused.sort(byName);
  return { teams, singleton: unused[0] ?? null };
}

/**
 * Winners move up one court, losers move down one. King winners stay.
 * A waiting pair replaces the losers of the lowest court.
 */
export function nextKotcRound(
  results: KotcCourtResult[],
  leftoverTeams: BracketTeam[] = [],
): { matches: KotcMatchDraft[]; leftoverTeams: BracketTeam[] } {
  if (results.length === 0) {
    throw new KotcError("kotc_need_four", "King of the Court needs at least one court");
  }
  const ordered = [...results].sort((left, right) => left.courtIndex - right.courtIndex);
  for (const [index, result] of ordered.entries()) {
    if (result.courtIndex !== index) {
      throw new KotcError("kotc_incomplete", "Courts must be 0…n without gaps");
    }
  }
  const winners = ordered.map(winningPair);
  const losers = ordered.map(losingPair);
  const waiting = leftoverTeams[0];
  const sitting = leftoverTeams.slice(waiting ? 1 : 0);

  if (ordered.length === 1) {
    const kingWinners = winners[0];
    const kingLosers = losers[0];
    if (!kingWinners || !kingLosers) {
      throw new KotcError("kotc_need_four", "King of the Court needs at least two pairs");
    }
    if (waiting) {
      return {
        matches: [{ courtIndex: 0, pairA: kingWinners, pairB: waiting }],
        leftoverTeams: [kingLosers, ...sitting],
      };
    }
    return {
      matches: [{ courtIndex: 0, pairA: kingWinners, pairB: kingLosers }],
      leftoverTeams: sitting,
    };
  }

  const slots: BracketTeam[][] = ordered.map(() => []);
  const firstWinners = winners[0];
  if (!firstWinners) {
    throw new KotcError("kotc_need_four", "King of the Court needs at least two pairs");
  }
  slots[0]?.push(firstWinners);
  for (let index = 1; index < winners.length; index += 1) {
    const pair = winners[index];
    if (pair) {
      slots[index - 1]?.push(pair);
    }
  }
  for (let index = 0; index < losers.length - 1; index += 1) {
    const pair = losers[index];
    if (pair) {
      slots[index + 1]?.push(pair);
    }
  }
  const lowestLosers = losers[losers.length - 1];
  if (lowestLosers) {
    slots[slots.length - 1]?.push(waiting ?? lowestLosers);
    if (waiting) {
      sitting.unshift(lowestLosers);
    }
  }

  const matches = slots.map((pairs, courtIndex) => {
    const pairA = pairs[0];
    const pairB = pairs[1];
    if (!pairA || !pairB) {
      throw new KotcError("kotc_incomplete", "Each court needs two pairs after rotation");
    }
    return { courtIndex, pairA, pairB };
  });
  return { matches, leftoverTeams: sitting };
}

export function replacePlayerInKotc(
  matches: KotcMatchDraft[],
  incoming: KotcBenchPlayer,
  replacePlayerId: string,
): KotcMatchDraft[] {
  if (incoming.id === replacePlayerId) {
    throw new KotcError("kotc_unknown_player", "Incoming and sit-out must differ");
  }
  let found = false;
  const next = matches.map((match) => {
    const swap = (pair: BracketTeam): BracketTeam => {
      if (pair.playerIds[0] === replacePlayerId) {
        found = true;
        return { playerIds: [incoming.id, pair.playerIds[1]], names: [incoming.name, pair.names[1]] };
      }
      if (pair.playerIds[1] === replacePlayerId) {
        found = true;
        return { playerIds: [pair.playerIds[0], incoming.id], names: [pair.names[0], incoming.name] };
      }
      return pair;
    };
    return { ...match, pairA: swap(match.pairA), pairB: swap(match.pairB) };
  });
  if (!found) {
    throw new KotcError("kotc_unknown_player", "Sit-out is not in the next round");
  }
  return next;
}
