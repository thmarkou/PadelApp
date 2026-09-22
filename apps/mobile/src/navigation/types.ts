import type { NavigatorScreenParams } from "@react-navigation/native";

export type RootStackParamList = {
  Login: undefined;
  Register: { clubSlug?: string } | undefined;
  Main: undefined;
};

export type MainTabParamList = {
  Home: undefined;
  Courts: NavigatorScreenParams<CourtsStackParamList> | undefined;
  Calendar: NavigatorScreenParams<CalendarStackParamList> | undefined;
  Players: NavigatorScreenParams<PlayersStackParamList> | undefined;
  Settings: NavigatorScreenParams<SettingsStackParamList> | undefined;
  More: NavigatorScreenParams<MoreStackParamList> | undefined;
};

export type MoreStackParamList = {
  MoreHub: undefined;
  TournamentsList: undefined;
  TournamentForm: undefined;
  TournamentDetail: { tournamentId: string };
  CategoryDetail: { categoryId: string };
};

export type SettingsStackParamList = {
  SettingsHub: undefined;
  SettingsBrand: undefined;
  SettingsSlots: undefined;
  SettingsBooking: undefined;
  SettingsLevels: undefined;
  SettingsOpenMatch: undefined;
  SettingsPairing: undefined;
  SettingsPresets: undefined;
  SettingsPresetEdit: { presetId?: string };
  SettingsFeatures: undefined;
};

export type CalendarStackParamList = {
  CalendarDay: undefined;
  OpenMatches: undefined;
  SlotDetail: {
    date: string;
    courtId: string;
    courtName: string;
    startsAt: string;
    durationMinutes: number;
    bookingId?: string;
  };
};

export type CourtsStackParamList = {
  CourtsList: undefined;
  CourtForm: { courtId?: string };
};

export type PlayersStackParamList = {
  PlayersList: undefined;
  PlayerForm: { playerId?: string; me?: boolean };
};
