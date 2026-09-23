import { sortForPairing, type PairingPlayerInput } from "./pairing.js";

export type BracketTeam = {
  playerIds: [string, string];
  names: [string, string];
};

export type BracketMatchDraft = {
  courtIndex: number;
  pairA: BracketTeam;
  pairB: BracketTeam | null;
};

export class KnockoutError extends Error {
  constructor(
    readonly code: "knockout_need_two_teams" | "knockout_odd_player" | "knockout_complete" | "knockout_draw",
    message: string,
  ) {
    super(message);
  }
}

function toTeam(left: PairingPlayerInput, right: PairingPlayerInput): BracketTeam {
  return {
    playerIds: [left.id, right.id],
    names: [left.name, right.name],
  };
}

function pairSum(left: PairingPlayerInput, right: PairingPlayerInput): number {
  return (left.level ?? 0) + (right.level ?? 0);
}

function sortTeams(teams: BracketTeam[], players: PairingPlayerInput[]): BracketTeam[] {
  const byId = new Map(players.map((player) => [player.id, player]));
  return [...teams].sort((left, right) => {
    const leftA = byId.get(left.playerIds[0]);
    const leftB = byId.get(left.playerIds[1]);
    const rightA = byId.get(right.playerIds[0]);
    const rightB = byId.get(right.playerIds[1]);
    const leftSum = leftA && leftB ? pairSum(leftA, leftB) : 0;
    const rightSum = rightA && rightB ? pairSum(rightA, rightB) : 0;
    if (rightSum !== leftSum) {
      return rightSum - leftSum;
    }
    return left.names.join(" ").localeCompare(right.names.join(" "));
  });
}

/** Strongest with weakest, same idea as daily snake pairs. Mixed = man + woman. */
export function formBracketTeams(
  players: PairingPlayerInput[],
  mixedDoubles: boolean,
): { teams: BracketTeam[]; leftover: Array<{ id: string; name: string }> } {
  if (mixedDoubles) {
    const men = sortForPairing(
      players.filter((player) => player.gender === "male"),
      "snake",
    );
    const women = sortForPairing(
      players.filter((player) => player.gender === "female"),
      "snake",
    );
    const leftover = players
      .filter((player) => player.gender !== "male" && player.gender !== "female")
      .map((player) => ({ id: player.id, name: player.name }));
    const pairCount = Math.min(men.length, women.length);
    const teams: BracketTeam[] = [];
    for (let index = 0; index < pairCount; index += 1) {
      const man = men[index];
      const woman = women[pairCount - 1 - index];
      if (man && woman) {
        teams.push(toTeam(man, woman));
      }
    }
    leftover.push(
      ...men.slice(pairCount).map((player) => ({ id: player.id, name: player.name })),
      ...women.slice(pairCount).map((player) => ({ id: player.id, name: player.name })),
    );
    return { teams: sortTeams(teams, players), leftover };
  }

  const sorted = sortForPairing(players, "snake");
  const leftover =
    sorted.length % 2 === 1
      ? sorted.slice(-1).map((player) => ({ id: player.id, name: player.name }))
      : [];
  const even = leftover.length > 0 ? sorted.slice(0, -1) : sorted;
  const teams: BracketTeam[] = [];
  for (let index = 0; index < even.length / 2; index += 1) {
    const strong = even[index];
    const weak = even[even.length - 1 - index];
    if (strong && weak) {
      teams.push(toTeam(strong, weak));
    }
  }
  return { teams: sortTeams(teams, players), leftover };
}

export function nextPowerOfTwo(value: number): number {
  let size = 1;
  while (size < value) {
    size *= 2;
  }
  return size;
}

/** Classic single-elim seeds: 8 → [1, 8, 4, 5, 2, 7, 3, 6]. */
export function seedSlots(size: number): number[] {
  if (size <= 1) {
    return [1];
  }
  if (size === 2) {
    return [1, 2];
  }
  const previous = seedSlots(size / 2);
  return previous.flatMap((seed) => [seed, size + 1 - seed]);
}

export function seedFirstRound(teams: BracketTeam[]): BracketMatchDraft[] {
  if (teams.length < 2) {
    throw new KnockoutError("knockout_need_two_teams", "Knockout needs at least two pairs");
  }
  const size = nextPowerOfTwo(teams.length);
  const slots: Array<BracketTeam | null> = Array.from({ length: size }, () => null);
  const order = seedSlots(size);
  teams.forEach((team, index) => {
    const position = order.indexOf(index + 1);
    if (position >= 0) {
      slots[position] = team;
    }
  });
  const matches: BracketMatchDraft[] = [];
  for (let index = 0; index < size; index += 2) {
    const left = slots[index] ?? null;
    const right = slots[index + 1] ?? null;
    if (!left && !right) {
      continue;
    }
    matches.push({
      courtIndex: matches.length,
      pairA: left ?? right!,
      pairB: left && right ? right : null,
    });
  }
  return matches;
}

export function winningTeam(match: {
  pairA: BracketTeam;
  pairB: BracketTeam | null;
  scoreA: number | null;
  scoreB: number | null;
}): BracketTeam {
  if (!match.pairB) {
    return match.pairA;
  }
  if (match.scoreA === null || match.scoreB === null) {
    throw new KnockoutError("knockout_draw", "Score the match before advancing");
  }
  if (match.scoreA === match.scoreB) {
    throw new KnockoutError("knockout_draw", "Knockout cannot end in a draw");
  }
  return match.scoreA > match.scoreB ? match.pairA : match.pairB;
}

export function nextKnockoutRound(winners: BracketTeam[]): BracketMatchDraft[] {
  if (winners.length < 2) {
    throw new KnockoutError("knockout_complete", "The bracket already has a winner");
  }
  const matches: BracketMatchDraft[] = [];
  for (let index = 0; index + 1 < winners.length; index += 2) {
    const pairA = winners[index];
    const pairB = winners[index + 1];
    if (!pairA || !pairB) {
      continue;
    }
    matches.push({ courtIndex: matches.length, pairA, pairB });
  }
  return matches;
}

export function isByeMatch(match: { pairB: BracketTeam | null | unknown[] }): boolean {
  return match.pairB === null || (Array.isArray(match.pairB) && match.pairB.length === 0);
}
