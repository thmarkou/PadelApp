import type {
  AppRole,
  ClubSettings,
  Court,
  Player,
  StandingRow,
  Tournament,
  TournamentCategory,
} from "@padelapp/shared";

export type PublicClub = { slug: string; name: string };

export type SessionUser = {
  id: string;
  clubId: string;
  email: string;
  displayName: string;
  role: AppRole;
};

export type SessionClub = { id: string; slug: string; name: string; createdAt: string };

export type MeResponse = { user: SessionUser; club: SessionClub };

export type DaySpot = { position: number; name: string; playerId: string | null };

export type DayBooking = {
  id: string;
  spots: DaySpot[];
  openSpots: number;
};

export type DaySlot = {
  startsAt: string;
  durationMinutes: number;
  maintenance: boolean;
  booking: DayBooking | null;
  waitlist: Array<{ id: string; guestName: string }>;
};

export type DayCourt = {
  id: string;
  name: string;
  kind: "indoor" | "outdoor";
  slots: DaySlot[];
};

export type DaySlotsResponse = {
  date: string;
  durationMinutes: number;
  courts: DayCourt[];
};

export type SettingsPayload = { settings: ClubSettings };
export type CourtsPayload = { courts: Court[] };
export type PlayersPayload = { players: Player[] };
export type TournamentListItem = Tournament & { categories: TournamentCategory[] };
export type TournamentsPayload = { tournaments: TournamentListItem[] };
export type TournamentDetailPayload = {
  tournament: Tournament;
  categories: TournamentCategory[];
};

export type TournamentEntry = {
  id: string;
  playerId: string;
  displayName: string;
  gender: Player["gender"];
  birthYear: number | null;
  level: number | null;
};

export type TournamentMatchView = {
  id: string;
  courtIndex: number;
  pairA: string[];
  pairB: string[];
  playerIds: { a1: string | null; a2: string | null; b1: string | null; b2: string | null };
  scoreA: number | null;
  scoreB: number | null;
  closed: boolean;
};

export type TournamentRoundView = {
  id: string;
  number: number;
  matches: TournamentMatchView[];
};

export type CategoryDetail = {
  tournament: Tournament | undefined;
  category: TournamentCategory;
  entries: TournamentEntry[];
  standings: StandingRow[];
  rounds: TournamentRoundView[];
};
