import { seedFirstRound, type BracketMatchDraft, type BracketTeam } from "./bracket.js";

export class GroupsError extends Error {
  constructor(
    readonly code: "groups_need_three_teams" | "groups_odd_player",
    message: string,
  ) {
    super(message);
  }
}

export type GroupAssignment = {
  groupIndex: number;
  teams: BracketTeam[];
};

export type GroupMatchDraft = BracketMatchDraft & {
  groupIndex: number;
};

export type GroupStandingRow = {
  team: BracketTeam;
  played: number;
  wins: number;
  pointsFor: number;
  pointsAgainst: number;
};

export type GroupScoredMatch = {
  pairA: BracketTeam;
  pairB: BracketTeam;
  scoreA: number;
  scoreB: number;
};

function teamKey(team: BracketTeam): string {
  return [...team.playerIds].sort().join("+");
}

export function fixtureKey(left: BracketTeam, right: BracketTeam): string {
  return [teamKey(left), teamKey(right)].sort().join("|");
}

/** Groups of 3–4 when possible. Never a group of 2. */
export function groupSizes(teamCount: number): number[] {
  if (teamCount < 3) {
    throw new GroupsError("groups_need_three_teams", "Groups need at least three pairs");
  }
  const sizes: number[] = [];
  let remaining = teamCount;
  while (remaining > 0) {
    if (remaining === 5) {
      sizes.push(5);
      remaining = 0;
    } else if (remaining === 2) {
      const last = sizes.pop();
      if (last === 4) {
        sizes.push(3, 3);
        remaining = 0;
      } else {
        throw new GroupsError("groups_need_three_teams", "Groups need at least three pairs");
      }
    } else if (remaining === 3 || remaining === 6 || remaining === 9) {
      sizes.push(3);
      remaining -= 3;
    } else {
      sizes.push(4);
      remaining -= 4;
    }
  }
  return sizes;
}

/** Seed 1, 2, 3… snake across groups so the strongest do not pile up. */
export function snakeIntoGroups(teams: BracketTeam[], sizes: number[]): GroupAssignment[] {
  const groups: GroupAssignment[] = sizes.map((_, groupIndex) => ({ groupIndex, teams: [] }));
  let group = 0;
  let direction = 1;
  for (const team of teams) {
    let guard = 0;
    while ((groups[group]?.teams.length ?? 0) >= (sizes[group] ?? 0) && guard < sizes.length + 2) {
      group += direction;
      if (group >= groups.length) {
        group = groups.length - 1;
        direction = -1;
      }
      if (group < 0) {
        group = 0;
        direction = 1;
      }
      guard += 1;
    }
    groups[group]?.teams.push(team);
    const next = group + direction;
    if (next >= groups.length || next < 0 || (groups[next]?.teams.length ?? 0) >= (sizes[next] ?? 0)) {
      direction *= -1;
    } else {
      group = next;
    }
  }
  return groups;
}

export function splitIntoGroups(teams: BracketTeam[]): GroupAssignment[] {
  return snakeIntoGroups(teams, groupSizes(teams.length));
}

/** Circle method. Odd count sits one team out each matchday. */
export function roundRobinRounds(teams: BracketTeam[]): Array<Array<[BracketTeam, BracketTeam]>> {
  if (teams.length < 2) {
    return [];
  }
  const bye = { playerIds: ["", ""] as [string, string], names: ["", ""] as [string, string] };
  const padded = teams.length % 2 === 0 ? [...teams] : [...teams, bye];
  const count = padded.length;
  const half = count / 2;
  const rotation = [...padded];
  const rounds: Array<Array<[BracketTeam, BracketTeam]>> = [];
  for (let day = 0; day < count - 1; day += 1) {
    const pairs: Array<[BracketTeam, BracketTeam]> = [];
    for (let index = 0; index < half; index += 1) {
      const left = rotation[index];
      const right = rotation[count - 1 - index];
      if (!left || !right || left.playerIds[0] === "" || right.playerIds[0] === "") {
        continue;
      }
      pairs.push([left, right]);
    }
    rounds.push(pairs);
    const last = rotation.pop();
    if (last) {
      rotation.splice(1, 0, last);
    }
  }
  return rounds;
}

export function groupStandings(teams: BracketTeam[], matches: GroupScoredMatch[]): GroupStandingRow[] {
  const rows = teams.map((team) => ({
    team,
    played: 0,
    wins: 0,
    pointsFor: 0,
    pointsAgainst: 0,
  }));
  const byKey = new Map(rows.map((row) => [teamKey(row.team), row]));
  for (const match of matches) {
    const home = byKey.get(teamKey(match.pairA));
    const away = byKey.get(teamKey(match.pairB));
    if (!home || !away) {
      continue;
    }
    home.played += 1;
    away.played += 1;
    home.pointsFor += match.scoreA;
    home.pointsAgainst += match.scoreB;
    away.pointsFor += match.scoreB;
    away.pointsAgainst += match.scoreA;
    if (match.scoreA > match.scoreB) {
      home.wins += 1;
    } else if (match.scoreB > match.scoreA) {
      away.wins += 1;
    }
  }
  return rows.sort((left, right) => {
    if (right.wins !== left.wins) {
      return right.wins - left.wins;
    }
    const leftDiff = left.pointsFor - left.pointsAgainst;
    const rightDiff = right.pointsFor - right.pointsAgainst;
    if (rightDiff !== leftDiff) {
      return rightDiff - leftDiff;
    }
    if (right.pointsFor !== left.pointsFor) {
      return right.pointsFor - left.pointsFor;
    }
    return left.team.names.join(" ").localeCompare(right.team.names.join(" "));
  });
}

export function groupQualifiers(standings: GroupStandingRow[][], perGroup = 2): BracketTeam[] {
  const firsts: BracketTeam[] = [];
  const seconds: BracketTeam[] = [];
  for (const table of standings) {
    if (table[0]) {
      firsts.push(table[0].team);
    }
    if (perGroup > 1 && table[1]) {
      seconds.push(table[1].team);
    }
  }
  return [...firsts, ...seconds];
}

export function nextGroupMatchday(
  groups: GroupAssignment[],
  playedKeys: Set<string>,
): GroupMatchDraft[] {
  const drafts: GroupMatchDraft[] = [];
  for (const group of groups) {
    const schedule = roundRobinRounds(group.teams);
    const pending = schedule.find((day) =>
      day.every((pair) => !playedKeys.has(fixtureKey(pair[0], pair[1]))),
    );
    if (!pending) {
      continue;
    }
    for (const [pairA, pairB] of pending) {
      drafts.push({
        courtIndex: drafts.length,
        groupIndex: group.groupIndex,
        pairA,
        pairB,
      });
    }
  }
  return drafts;
}

export function groupStageComplete(groups: GroupAssignment[], scoredKeys: Set<string>): boolean {
  return groups.every((group) => {
    const schedule = roundRobinRounds(group.teams);
    return schedule.every((day) =>
      day.every((pair) => scoredKeys.has(fixtureKey(pair[0], pair[1]))),
    );
  });
}

export function knockoutFromQualifiers(qualifiers: BracketTeam[]): BracketMatchDraft[] {
  return seedFirstRound(qualifiers);
}
