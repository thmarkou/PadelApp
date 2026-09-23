import type {
  ClubSettings,
  FeatureFlags,
  Scoring,
  TournamentFormat,
  TournamentPreset,
} from "@padelapp/shared";

export const uiLocales = ["el", "en"] as const;

export const colorSwatches = ["#1F6B4A", "#1D4ED8", "#0F766E", "#B45309", "#9F1239"] as const;

export const timezoneOptions = ["Europe/Athens", "Europe/London", "UTC"] as const;

export const currencyOptions = ["EUR", "GBP", "USD"] as const;

export const slotDurationSuggestions = [45, 60, 90, 120] as const;

export const tournamentFormats: TournamentFormat[] = [
  "americano",
  "mexicano",
  "kotc",
  "knockout",
  "groups_ko",
];

export const featureFlagKeys: Array<keyof FeatureFlags> = [
  "payments",
  "whatsapp",
  "qrCheckin",
  "dynamicPricing",
  "weather",
  "tv",
  "gdprExport",
];

export function emptyPreset(): TournamentPreset {
  return {
    id: `preset-${Date.now()}`,
    name: "",
    format: "mexicano",
    scoring: { kind: "fixed_points", points: 24 },
  };
}

export function scoringForKind(kind: Scoring["kind"]): Scoring {
  if (kind === "official") {
    return {
      kind: "official",
      deuce: "golden_point",
      set: "standard_6_tb7",
      match: "best_of_3_super_tb10",
    };
  }
  if (kind === "timed") {
    return { kind: "timed", minutes: 12 };
  }
  if (kind === "kotc_race") {
    return { kind: "kotc_race", raceTo: 5 };
  }
  return { kind: "fixed_points", points: 24 };
}

export function normalizeHex(value: string): string {
  const trimmed = value.trim();
  if (/^[0-9A-Fa-f]{6}$/.test(trimmed)) {
    return `#${trimmed}`;
  }
  return trimmed;
}

export function withLogoUrl(settings: ClubSettings, logoUrl: string): ClubSettings {
  const trimmed = logoUrl.trim();
  return {
    ...settings,
    branding: {
      ...settings.branding,
      logoUrl: trimmed.length === 0 ? null : trimmed,
    },
  };
}
