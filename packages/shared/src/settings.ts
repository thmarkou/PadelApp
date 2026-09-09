import { z } from "zod";

const officialScoringSchema = z.object({
  kind: z.literal("official"),
  deuce: z.enum(["advantage", "golden_point", "star_point"]),
  set: z.enum(["standard_6_tb7", "mini_4"]),
  match: z.enum(["one_set", "best_of_3", "best_of_3_super_tb10", "best_of_3_tb7"]),
});

const socialScoringSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("fixed_points"),
    points: z.union([z.literal(16), z.literal(21), z.literal(24), z.literal(32)]),
  }),
  z.object({
    kind: z.literal("timed"),
    minutes: z.number().int().min(8).max(15),
  }),
  z.object({
    kind: z.literal("kotc_race"),
    raceTo: z.union([z.literal(4), z.literal(5), z.literal(7)]),
  }),
]);

const scoringSchema = z.union([officialScoringSchema, socialScoringSchema]);

const tournamentFormatSchema = z.enum([
  "americano",
  "mexicano",
  "kotc",
  "knockout",
  "groups_ko",
  "round_robin",
  "box_league",
]);

export const clubSettingsSchema = z.object({
  branding: z.object({
    name: z.string().min(1),
    primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
    logoUrl: z
      .union([z.string().url(), z.literal(""), z.null()])
      .transform((value) => (value === "" ? null : value)),
  }),
  locale: z.enum(["el", "en"]),
  timezone: z.string().min(1),
  currency: z.string().min(1).max(8),
  slotTemplates: z
    .array(z.object({ durationMinutes: z.number().int().min(15).max(240) }))
    .min(1),
  defaultSlotDurationMinutes: z.number().int().min(15).max(240),
  slotBufferMinutes: z.number().int().min(0).max(60),
  bookingRules: z.object({
    cancelHoursBefore: z.number().int().min(0).max(168),
    waitlistEnabled: z.boolean(),
  }),
  levels: z.object({
    min: z.number().min(0).max(10),
    max: z.number().min(0).max(10),
    step: z.number().gt(0).max(1),
    bands: z
      .array(
        z.object({
          id: z.string().min(1),
          name: z.string().min(1),
          min: z.number(),
          max: z.number(),
        }),
      )
      .min(1),
    confirmRole: z.enum(["coach", "admin"]),
    eloK: z.number().int().min(8).max(64),
  }),
  openMatch: z.object({
    levelDelta: z.number().gt(0).max(3),
    allowedMissing: z.array(z.union([z.literal(1), z.literal(2)])).min(1),
  }),
  pairing: z.object({
    algorithm: z.enum(["snake", "mexicano"]),
    allowAdminOverride: z.boolean(),
  }),
  tournamentPresets: z
    .array(
      z.object({
        id: z.string().min(1),
        name: z.string().min(1),
        format: tournamentFormatSchema,
        scoring: scoringSchema,
      }),
    )
    .min(1),
  features: z.object({
    payments: z.boolean(),
    whatsapp: z.boolean(),
    qrCheckin: z.boolean(),
    dynamicPricing: z.boolean(),
    weather: z.boolean(),
    tv: z.boolean(),
    gdprExport: z.boolean(),
  }),
});

export type ClubSettingsInput = z.input<typeof clubSettingsSchema>;

export function parseClubSettings(value: unknown) {
  return clubSettingsSchema.parse(value);
}
