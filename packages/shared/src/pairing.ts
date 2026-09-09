import type { AppRole, PairingAlgorithm, PlayerGender } from "./types.js";

export type PairingPlayerInput = {
  id: string;
  name: string;
  level: number | null;
  standingPoints?: number;
  gender?: PlayerGender | null;
};

export type PairingPair = {
  playerIds: [string, string];
  names: [string, string];
  sum: number | null;
};

export type PairingMatch = {
  courtIndex: number;
  pairA: PairingPair;
  pairB: PairingPair;
};

export type PairingResult = {
  algorithm: PairingAlgorithm;
  overridden: boolean;
  matches: PairingMatch[];
  leftover: Array<{ id: string; name: string }>;
};

export type PairingOverrideMatch = {
  pairA: [string, string];
  pairB: [string, string];
};

export class PairingError extends Error {
  constructor(
    readonly code:
      | "pairing_need_four"
      | "pairing_need_mixed"
      | "pairing_invalid_override"
      | "pairing_not_four",
    message: string,
  ) {
    super(message);
  }
}

export function canProposePairing(role: AppRole): boolean {
  return role === "owner" || role === "reception" || role === "coach";
}

export function canOverridePairing(role: AppRole, allowAdminOverride: boolean): boolean {
  return allowAdminOverride && (role === "owner" || role === "reception");
}

function pairSum(left: number | null, right: number | null): number | null {
  if (left === null || right === null) {
    return null;
  }
  return Number((left + right).toFixed(2));
}

function makePair(left: PairingPlayerInput, right: PairingPlayerInput): PairingPair {
  return {
    playerIds: [left.id, right.id],
    names: [left.name, right.name],
    sum: pairSum(left.level, right.level),
  };
}

export function sortForPairing(
  players: PairingPlayerInput[],
  algorithm: PairingAlgorithm,
): PairingPlayerInput[] {
  return [...players].sort((left, right) => {
    if (algorithm === "mexicano") {
      const leftPoints = left.standingPoints ?? 0;
      const rightPoints = right.standingPoints ?? 0;
      if (rightPoints !== leftPoints) {
        return rightPoints - leftPoints;
      }
    }
    if (left.level === null && right.level === null) {
      return left.name.localeCompare(right.name);
    }
    if (left.level === null) {
      return 1;
    }
    if (right.level === null) {
      return -1;
    }
    if (right.level !== left.level) {
      return right.level - left.level;
    }
    return left.name.localeCompare(right.name);
  });
}

function groupOfFour(group: PairingPlayerInput[], courtIndex: number): PairingMatch {
  const first = group[0];
  const second = group[1];
  const third = group[2];
  const fourth = group[3];
  if (!first || !second || !third || !fourth) {
    throw new PairingError("pairing_need_four", "Need four players for a court");
  }
  return {
    courtIndex,
    pairA: makePair(first, fourth),
    pairB: makePair(second, third),
  };
}

function playerMap(players: PairingPlayerInput[]): Map<string, PairingPlayerInput> {
  return new Map(players.map((player) => [player.id, player]));
}

function serializePair(pair: PairingPair): string {
  return [...pair.playerIds].sort().join("+");
}

export function serializeMatch(match: PairingMatch): string {
  return [serializePair(match.pairA), serializePair(match.pairB)].sort().join("|");
}

export function fourPlayerOverrides(players: PairingPlayerInput[]): PairingOverrideMatch[] {
  const ids = [...new Set(players.map((player) => player.id))].sort();
  const [a, b, c, d] = ids;
  if (!a || !b || !c || !d || ids.length !== 4) {
    throw new PairingError("pairing_not_four", "Override cycle needs exactly four players");
  }
  return [
    { pairA: [a, b], pairB: [c, d] },
    { pairA: [a, c], pairB: [b, d] },
    { pairA: [a, d], pairB: [b, c] },
  ];
}

export function applyOverride(
  players: PairingPlayerInput[],
  algorithm: PairingAlgorithm,
  override: PairingOverrideMatch[],
): PairingResult {
  const byId = playerMap(players);
  const used = new Set<string>();
  const matches = override.map((item, courtIndex) => {
    const ids = [...item.pairA, ...item.pairB];
    if (new Set(ids).size !== 4) {
      throw new PairingError("pairing_invalid_override", "Each court needs four distinct players");
    }
    const resolved = ids.map((id) => {
      const player = byId.get(id);
      if (!player || used.has(id)) {
        throw new PairingError("pairing_invalid_override", "Override uses an unknown or repeated player");
      }
      used.add(id);
      return player;
    });
    const [a, b, c, d] = resolved;
    if (!a || !b || !c || !d) {
      throw new PairingError("pairing_invalid_override", "Override uses an unknown player");
    }
    return {
      courtIndex,
      pairA: makePair(a, b),
      pairB: makePair(c, d),
    };
  });
  return {
    algorithm,
    overridden: true,
    matches,
    leftover: players.filter((player) => !used.has(player.id)).map((player) => ({
      id: player.id,
      name: player.name,
    })),
  };
}

export function pairPlayers(
  players: PairingPlayerInput[],
  options: { algorithm: PairingAlgorithm; override?: PairingOverrideMatch[] },
): PairingResult {
  if (options.override && options.override.length > 0) {
    return applyOverride(players, options.algorithm, options.override);
  }
  if (players.length < 4) {
    throw new PairingError("pairing_need_four", "Need at least four players");
  }
  const sorted = sortForPairing(players, options.algorithm);
  const matches: PairingMatch[] = [];
  let index = 0;
  let court = 0;
  while (index + 4 <= sorted.length) {
    matches.push(groupOfFour(sorted.slice(index, index + 4), court));
    index += 4;
    court += 1;
  }
  return {
    algorithm: options.algorithm,
    overridden: false,
    matches,
    leftover: sorted.slice(index).map((player) => ({ id: player.id, name: player.name })),
  };
}

export function cyclePairing(players: PairingPlayerInput[], current: PairingResult): PairingResult {
  const alternatives = fourPlayerOverrides(players);
  const currentKey = current.matches[0] ? serializeMatch(current.matches[0]) : "";
  const currentIndex = alternatives.findIndex((item) => {
    const next = applyOverride(players, current.algorithm, [item]);
    const match = next.matches[0];
    return match ? serializeMatch(match) === currentKey : false;
  });
  const next = alternatives[(currentIndex + 1) % alternatives.length];
  if (!next) {
    throw new PairingError("pairing_not_four", "No alternative pairing");
  }
  return applyOverride(players, current.algorithm, [next]);
}

export function pairMixedDoubles(
  players: PairingPlayerInput[],
  algorithm: PairingAlgorithm,
): PairingResult {
  const men = sortForPairing(
    players.filter((player) => player.gender === "male"),
    algorithm,
  );
  const women = sortForPairing(
    players.filter((player) => player.gender === "female"),
    algorithm,
  );
  const leftover = players.filter((player) => player.gender !== "male" && player.gender !== "female");
  const pairCount = Math.min(men.length, women.length);
  if (pairCount < 2) {
    throw new PairingError("pairing_need_mixed", "Mixed doubles needs at least two men and two women");
  }
  const mixedPairs: PairingPair[] = [];
  for (let index = 0; index < pairCount; index += 1) {
    const man = men[index];
    const woman = women[pairCount - 1 - index];
    if (!man || !woman) {
      break;
    }
    mixedPairs.push(makePair(man, woman));
  }
  leftover.push(...men.slice(pairCount), ...women.slice(pairCount));
  mixedPairs.sort((left, right) => (right.sum ?? 0) - (left.sum ?? 0));
  const matches: PairingMatch[] = [];
  let cursor = 0;
  let court = 0;
  while (cursor + 2 <= mixedPairs.length) {
    if (cursor + 4 <= mixedPairs.length) {
      const first = mixedPairs[cursor];
      const second = mixedPairs[cursor + 1];
      const third = mixedPairs[cursor + 2];
      const fourth = mixedPairs[cursor + 3];
      if (first && fourth) {
        matches.push({ courtIndex: court, pairA: first, pairB: fourth });
        court += 1;
      }
      if (second && third) {
        matches.push({ courtIndex: court, pairA: second, pairB: third });
        court += 1;
      }
      cursor += 4;
    } else {
      const first = mixedPairs[cursor];
      const second = mixedPairs[cursor + 1];
      if (first && second) {
        matches.push({ courtIndex: court, pairA: first, pairB: second });
        court += 1;
      }
      cursor += 2;
    }
  }
  const pairedIds = new Set(matches.flatMap((match) => [...match.pairA.playerIds, ...match.pairB.playerIds]));
  leftover.push(...players.filter((player) => !pairedIds.has(player.id) && !leftover.some((item) => item.id === player.id)));
  return {
    algorithm,
    overridden: false,
    matches,
    leftover: leftover.map((player) => ({ id: player.id, name: player.name })),
  };
}

export function pairForCategory(
  players: PairingPlayerInput[],
  options: { algorithm: PairingAlgorithm; mixedDoubles: boolean },
): PairingResult {
  if (options.mixedDoubles) {
    return pairMixedDoubles(players, options.algorithm);
  }
  return pairPlayers(players, { algorithm: options.algorithm });
}
