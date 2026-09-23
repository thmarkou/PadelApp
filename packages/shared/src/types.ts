import type { TournamentPlaySlot } from "./playSlots.js";

export type ClubId = string;

/** App UI languages. Add a locale here and a translation file — screens stay unchanged. */
export const appLocales = ["el", "en"] as const;
export type Locale = (typeof appLocales)[number];

export const appRoles = ["owner", "reception", "coach", "player"] as const;
export type AppRole = (typeof appRoles)[number];
export type StaffRole = Exclude<AppRole, "player">;

export type ConfirmRole = "coach" | "admin";
export type CourtKind = "indoor" | "outdoor";
export type PairingAlgorithm = "snake" | "mexicano";
export const playerGenders = ["male", "female"] as const;
export type PlayerGender = (typeof playerGenders)[number];
/** Owner picks these when creating a tournament category. Mixed = man+woman vs man+woman. */
export const tournamentGenderRules = ["men", "women", "mixed_doubles"] as const;
export type TournamentGenderRule = (typeof tournamentGenderRules)[number];
export type TournamentFormat =
  | "americano"
  | "mexicano"
  | "kotc"
  | "knockout"
  | "groups_ko"
  | "round_robin"
  | "box_league";

export type GameDeuce = "advantage" | "golden_point" | "star_point";
export type SetSystem = "standard_6_tb7" | "mini_4";
export type MatchSystem =
  | "one_set"
  | "best_of_3"
  | "best_of_3_super_tb10"
  | "best_of_3_tb7";

export type OfficialScoring = {
  kind: "official";
  deuce: GameDeuce;
  set: SetSystem;
  match: MatchSystem;
};

export type SocialScoring =
  | { kind: "fixed_points"; points: 16 | 21 | 24 | 32 }
  | { kind: "timed"; minutes: number }
  | { kind: "kotc_race"; raceTo: 4 | 5 | 7 };

export type Scoring = OfficialScoring | SocialScoring;

export type TournamentPreset = {
  id: string;
  name: string;
  format: TournamentFormat;
  scoring: Scoring;
};

export type LevelBand = {
  id: string;
  name: string;
  min: number;
  max: number;
};

export type FeatureFlags = {
  payments: boolean;
  whatsapp: boolean;
  qrCheckin: boolean;
  dynamicPricing: boolean;
  weather: boolean;
  tv: boolean;
  gdprExport: boolean;
};

export type ClubSettings = {
  branding: {
    name: string;
    primaryColor: string;
    logoUrl: string | null;
  };
  locale: Locale;
  timezone: string;
  currency: string;
  slotTemplates: { durationMinutes: number }[];
  defaultSlotDurationMinutes: number;
  slotBufferMinutes: number;
  bookingRules: {
    cancelHoursBefore: number;
    waitlistEnabled: boolean;
  };
  levels: {
    min: number;
    max: number;
    step: number;
    bands: LevelBand[];
    confirmRole: ConfirmRole;
    eloK: number;
  };
  openMatch: {
    levelDelta: number;
    allowedMissing: Array<1 | 2>;
  };
  pairing: {
    algorithm: PairingAlgorithm;
    allowAdminOverride: boolean;
  };
  tournamentPresets: TournamentPreset[];
  features: FeatureFlags;
};

export type Club = {
  id: ClubId;
  slug: string;
  name: string;
  createdAt: string;
};

export type Court = {
  id: string;
  clubId: ClubId;
  name: string;
  kind: CourtKind;
  openTime: string;
  closeTime: string;
  isActive: boolean;
  maintenanceUntil: string | null;
  sortOrder: number;
};

export type Player = {
  id: string;
  clubId: ClubId;
  userId: string | null;
  displayName: string;
  phone: string | null;
  email: string | null;
  gender: PlayerGender | null;
  birthYear: number | null;
  selfLevel: number | null;
  confirmedLevel: number | null;
  createdAt: string;
};

export const tournamentStatuses = ["draft", "open", "running", "closed"] as const;
export type TournamentStatus = (typeof tournamentStatuses)[number];

export type TournamentCategoryRule = {
  gender: TournamentGenderRule;
  minAge: number | null;
  maxAge: number | null;
  minLevel: number | null;
  maxLevel: number | null;
};

export type Slot = {
  id: string;
  clubId: ClubId;
  courtId: string;
  startsAt: string;
  durationMinutes: number;
};

export type Booking = {
  id: string;
  clubId: ClubId;
  slotId: string;
  playerIds: string[];
  status: "confirmed" | "waitlist" | "cancelled";
};

export type Tournament = {
  id: string;
  clubId: ClubId;
  name: string;
  startsOn: string;
  format: TournamentFormat;
  scoring: Scoring;
  status: TournamentStatus;
  createdAt: string;
  playSlots?: TournamentPlaySlot[];
};

export type TournamentCategory = TournamentCategoryRule & {
  id: string;
  tournamentId: string;
  name: string;
  sortOrder: number;
  entryCount?: number;
};

export type AppUser = {
  id: string;
  clubId: ClubId;
  email: string;
  displayName: string;
  role: AppRole;
};

export type StaffUser = AppUser & { role: StaffRole };
