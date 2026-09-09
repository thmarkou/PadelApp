import type { ClubSettings, FeatureFlags, TournamentPreset } from "./types.js";

const v1FeaturesOff: FeatureFlags = {
  payments: false,
  whatsapp: false,
  qrCheckin: false,
  dynamicPricing: false,
  weather: false,
  tv: false,
  gdprExport: false,
};

const officialWeekend: TournamentPreset = {
  id: "weekend-official",
  name: "Σαββατοκύριακο — σταθερά ζευγάρια",
  format: "knockout",
  scoring: {
    kind: "official",
    deuce: "golden_point",
    set: "standard_6_tb7",
    match: "best_of_3_super_tb10",
  },
};

const eveningSocial: TournamentPreset = {
  id: "evening-social",
  name: "Βραδιά — Mexicano 24",
  format: "mexicano",
  scoring: { kind: "fixed_points", points: 24 },
};

const officialAdvantage: TournamentPreset = {
  id: "official-advantage",
  name: "Best of 3, advantage, super TB 10",
  format: "round_robin",
  scoring: {
    kind: "official",
    deuce: "advantage",
    set: "standard_6_tb7",
    match: "best_of_3_super_tb10",
  },
};

const oneSetGolden: TournamentPreset = {
  id: "one-set-golden",
  name: "Ένα set, golden point",
  format: "knockout",
  scoring: {
    kind: "official",
    deuce: "golden_point",
    set: "standard_6_tb7",
    match: "one_set",
  },
};

const miniSets: TournamentPreset = {
  id: "mini-sets",
  name: "Mini-sets, golden point, best of 3",
  format: "groups_ko",
  scoring: {
    kind: "official",
    deuce: "golden_point",
    set: "mini_4",
    match: "best_of_3",
  },
};

const defaultBands = [
  { id: "C", name: "C", min: 1.0, max: 2.9 },
  { id: "B", name: "B", min: 3.0, max: 4.9 },
  { id: "A", name: "A", min: 5.0, max: 7.0 },
];

/** Club A — typical Greek evening club (90′ slots, Mexicano). */
export function settingsClubEvening(name: string): ClubSettings {
  return {
    branding: { name, primaryColor: "#1F6B4A", logoUrl: null },
    locale: "el",
    timezone: "Europe/Athens",
    currency: "EUR",
    slotTemplates: [
      { durationMinutes: 60 },
      { durationMinutes: 90 },
      { durationMinutes: 120 },
    ],
    defaultSlotDurationMinutes: 90,
    slotBufferMinutes: 0,
    bookingRules: { cancelHoursBefore: 12, waitlistEnabled: true },
    levels: {
      min: 1.0,
      max: 7.0,
      step: 0.1,
      bands: defaultBands,
      confirmRole: "coach",
      eloK: 24,
    },
    openMatch: { levelDelta: 0.4, allowedMissing: [1, 2] },
    pairing: { algorithm: "mexicano", allowAdminOverride: true },
    tournamentPresets: [
      eveningSocial,
      officialWeekend,
      officialAdvantage,
      oneSetGolden,
      miniSets,
    ],
    features: v1FeaturesOff,
  };
}

/** Club B — different params on purpose (60′ slots, snake pairing). */
export function settingsClubDaytime(name: string): ClubSettings {
  return {
    branding: { name, primaryColor: "#1D4ED8", logoUrl: null },
    locale: "el",
    timezone: "Europe/Athens",
    currency: "EUR",
    slotTemplates: [
      { durationMinutes: 45 },
      { durationMinutes: 60 },
      { durationMinutes: 90 },
    ],
    defaultSlotDurationMinutes: 60,
    slotBufferMinutes: 5,
    bookingRules: { cancelHoursBefore: 6, waitlistEnabled: false },
    levels: {
      min: 1.0,
      max: 7.0,
      step: 0.5,
      bands: [
        { id: "archarios", name: "Αρχάριοι", min: 1.0, max: 2.5 },
        { id: "mesi", name: "Μεσαίοι", min: 2.6, max: 4.5 },
        { id: "prohorimenoi", name: "Προχωρημένοι", min: 4.6, max: 7.0 },
      ],
      confirmRole: "admin",
      eloK: 16,
    },
    openMatch: { levelDelta: 0.8, allowedMissing: [1] },
    pairing: { algorithm: "snake", allowAdminOverride: false },
    tournamentPresets: [
      {
        id: "americano-24",
        name: "Americano 24",
        format: "americano",
        scoring: { kind: "fixed_points", points: 24 },
      },
      officialWeekend,
      miniSets,
    ],
    features: v1FeaturesOff,
  };
}
