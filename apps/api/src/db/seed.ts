import type { AppRole, CourtKind } from "@padelapp/shared";
import {
  settingsClubDaytime,
  settingsClubEvening,
} from "@padelapp/shared";
import { apiConfig, loadPadelEnv } from "../env.js";
import { hashPassword } from "../auth/password.js";
import { getPool } from "./pool.js";

loadPadelEnv();

type SeedClub = {
  slug: string;
  name: string;
  settings: ReturnType<typeof settingsClubEvening>;
  courts: Array<{
    name: string;
    kind: CourtKind;
    openTime: string;
    closeTime: string;
  }>;
};

/**
 * Courts are club records, never a hardcoded count in the app.
 * Club A has 3 (mixed indoor/outdoor); Club B has 2 outdoor — on purpose.
 */
const clubs: SeedClub[] = [
  {
    slug: "club-a",
    name: "Club A Evening",
    settings: settingsClubEvening("Club A Evening"),
    courts: [
      { name: "Γήπεδο 1", kind: "indoor", openTime: "08:00", closeTime: "23:00" },
      { name: "Γήπεδο 2", kind: "indoor", openTime: "08:00", closeTime: "23:00" },
      { name: "Γήπεδο 3", kind: "outdoor", openTime: "09:00", closeTime: "21:00" },
    ],
  },
  {
    slug: "club-b",
    name: "Club B Daytime",
    settings: settingsClubDaytime("Club B Daytime"),
    courts: [
      { name: "Court 1", kind: "outdoor", openTime: "07:00", closeTime: "20:00" },
      { name: "Court 2", kind: "outdoor", openTime: "07:00", closeTime: "20:00" },
    ],
  },
];

function athensStamp(daysAhead: number, hour: number, minute: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00`;
}

async function playerIdByName(
  pool: ReturnType<typeof getPool>,
  clubId: string,
  name: string,
): Promise<string | undefined> {
  const found = await pool.query<{ id: string }>(
    "SELECT id FROM players WHERE club_id = $1 AND lower(display_name) = lower($2) LIMIT 1",
    [clubId, name],
  );
  return found.rows[0]?.id;
}

async function seedOpenBooking(
  pool: ReturnType<typeof getPool>,
  input: {
    clubId: string;
    courtId: string;
    startsAt: string;
    durationMinutes: number;
    names: string[];
  },
): Promise<void> {
  const clash = await pool.query<{ id: string }>(
    `SELECT id FROM bookings
     WHERE club_id = $1 AND court_id = $2 AND status = 'confirmed'
       AND starts_at = $3::timestamptz`,
    [input.clubId, input.courtId, input.startsAt],
  );
  if (clash.rows[0]) {
    return;
  }
  const created = await pool.query<{ id: string }>(
    `INSERT INTO bookings (club_id, court_id, starts_at, duration_minutes, status)
     VALUES ($1, $2, $3::timestamptz, $4, 'confirmed')
     RETURNING id`,
    [input.clubId, input.courtId, input.startsAt, input.durationMinutes],
  );
  const bookingId = created.rows[0]?.id;
  if (!bookingId) {
    return;
  }
  for (const [index, name] of input.names.entries()) {
    const playerId = await playerIdByName(pool, input.clubId, name);
    await pool.query(
      `INSERT INTO booking_spots (booking_id, club_id, position, guest_name, player_id)
       VALUES ($1, $2, $3, $4, $5)`,
      [bookingId, input.clubId, index + 1, name, playerId ?? null],
    );
  }
}

const seedRoles: Array<{ role: AppRole; mailbox: string; label: string }> = [
  { role: "owner", mailbox: "owner", label: "Owner" },
  { role: "reception", mailbox: "reception", label: "Reception" },
  { role: "coach", mailbox: "coach", label: "Coach" },
  { role: "player", mailbox: "player", label: "Player" },
];

async function seed(): Promise<void> {
  const pool = getPool();
  const passwordHash = await hashPassword(apiConfig().seedPassword);

  for (const club of clubs) {
    const existing = await pool.query<{ id: string }>(
      "SELECT id FROM clubs WHERE slug = $1",
      [club.slug],
    );
    const clubId =
      existing.rows[0]?.id ??
      (
        await pool.query<{ id: string }>(
          "INSERT INTO clubs (slug, name) VALUES ($1, $2) RETURNING id",
          [club.slug, club.name],
        )
      ).rows[0]?.id;

    if (!clubId) {
      throw new Error(`Failed to upsert club ${club.slug}`);
    }

    await pool.query(
      `INSERT INTO club_settings (club_id, settings)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (club_id) DO UPDATE SET settings = EXCLUDED.settings, updated_at = now()`,
      [clubId, JSON.stringify(club.settings)],
    );

    for (const user of seedRoles) {
      const saved = await pool.query<{ id: string }>(
        `INSERT INTO users (club_id, email, password_hash, display_name, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (club_id, email) DO UPDATE SET
           password_hash = EXCLUDED.password_hash,
           display_name = EXCLUDED.display_name,
           role = EXCLUDED.role
         RETURNING id`,
        [
          clubId,
          `${user.mailbox}@${club.slug}.local`,
          passwordHash,
          `${club.name} ${user.label}`,
          user.role,
        ],
      );
      const userId = saved.rows[0]?.id;
      if (user.role === "player" && userId) {
        await pool.query(
          `INSERT INTO players (club_id, user_id, display_name, email, self_level, gender, birth_year)
           SELECT $1, $2, $3, $4, $5, $6, $7
           WHERE NOT EXISTS (
             SELECT 1 FROM players WHERE club_id = $1 AND user_id = $2
           )`,
          [
            clubId,
            userId,
            `${club.name} ${user.label}`,
            `${user.mailbox}@${club.slug}.local`,
            club.slug === "club-a" ? 3.2 : 2.5,
            club.slug === "club-a" ? "male" : "female",
            club.slug === "club-a" ? 1996 : 2013,
          ],
        );
        await pool.query(
          `UPDATE players SET gender = COALESCE(gender, $3), birth_year = COALESCE(birth_year, $4)
           WHERE club_id = $1 AND user_id = $2`,
          [clubId, userId, club.slug === "club-a" ? "male" : "female", club.slug === "club-a" ? 1996 : 2013],
        );
      }
    }

    const courtCount = await pool.query<{ count: string }>(
      "SELECT count(*)::text AS count FROM courts WHERE club_id = $1",
      [clubId],
    );
    if (courtCount.rows[0]?.count === "0") {
      for (const [index, court] of club.courts.entries()) {
        await pool.query(
          `INSERT INTO courts (club_id, name, kind, open_time, close_time, sort_order)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [clubId, court.name, court.kind, court.openTime, court.closeTime, index],
        );
      }
    }

    const playerNames =
      club.slug === "club-a"
        ? [
            { name: "Νίκος Παπαδόπουλος", self: 4.1, confirmed: 4.0, gender: "male", birthYear: 1988 },
            { name: "Μαρία Κωνσταντίνου", self: 2.8, confirmed: 3.0, gender: "female", birthYear: 1992 },
            { name: "Αντώνης Λάλας", self: 5.4, confirmed: null, gender: "male", birthYear: 1985 },
          ]
        : [
            { name: "Helen Cole", self: 3.5, confirmed: 3.5, gender: "female", birthYear: 1990 },
            { name: "Mark Ryan", self: 1.5, confirmed: null, gender: "male", birthYear: 2012 },
          ];
    for (const person of playerNames) {
        await pool.query(
          `UPDATE players
         SET self_level = COALESCE(self_level, $3),
             confirmed_level = COALESCE(confirmed_level, $4),
             gender = COALESCE(gender, $5),
             birth_year = COALESCE(birth_year, $6)
         WHERE club_id = $1 AND lower(display_name) = lower($2)`,
        [clubId, person.name, person.self, person.confirmed, person.gender, person.birthYear],
      );
      await pool.query(
        `INSERT INTO players (club_id, display_name, self_level, confirmed_level, gender, birth_year)
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM players WHERE club_id = $1 AND lower(display_name) = lower($2)
         )`,
        [clubId, person.name, person.self, person.confirmed, person.gender, person.birthYear],
      );
    }

    if (club.slug === "club-a") {
      for (const extra of [
        { name: "Γιώργος Α", self: 5.6, confirmed: 5.6, gender: "male", birthYear: 1990 },
        { name: "Πέτρος Α", self: 5.8, confirmed: 5.8, gender: "male", birthYear: 1994 },
        { name: "Ελένη Β", self: 3.4, confirmed: 3.4, gender: "female", birthYear: 1991 },
      ]) {
        await pool.query(
          `INSERT INTO players (club_id, display_name, self_level, confirmed_level, gender, birth_year)
           SELECT $1, $2, $3, $4, $5, $6
           WHERE NOT EXISTS (
             SELECT 1 FROM players WHERE club_id = $1 AND lower(display_name) = lower($2)
           )`,
          [clubId, extra.name, extra.self, extra.confirmed, extra.gender, extra.birthYear],
        );
        await pool.query(
          `UPDATE players SET gender = COALESCE(gender, $3), birth_year = COALESCE(birth_year, $4)
           WHERE club_id = $1 AND lower(display_name) = lower($2)`,
          [clubId, extra.name, extra.gender, extra.birthYear],
        );
      }
    }
    if (club.slug === "club-b") {
      await pool.query(
        `INSERT INTO players (club_id, display_name, self_level, confirmed_level, gender, birth_year)
         SELECT $1, $2, $3, $4, $5, $6
         WHERE NOT EXISTS (
           SELECT 1 FROM players WHERE club_id = $1 AND lower(display_name) = lower($2)
         )`,
        [clubId, "Sara Lin", 2.5, 2.5, "female", 1998],
      );
    }

    await pool.query(
      `DELETE FROM bookings
       WHERE club_id = $1 AND created_by IS NULL AND starts_at > now()`,
      [clubId],
    );

    const courts = await pool.query<{ id: string; name: string }>(
      "SELECT id, name FROM courts WHERE club_id = $1 ORDER BY sort_order, name",
      [clubId],
    );
    const courtByName = new Map(courts.rows.map((row) => [row.name, row.id]));
    const firstCourt = courtByName.get(club.courts[0]?.name ?? "") ?? courts.rows[0]?.id;
    const secondCourt = courtByName.get(club.courts[1]?.name ?? "") ?? courts.rows[1]?.id;
    const duration = club.settings.defaultSlotDurationMinutes;
    if (club.slug === "club-a" && firstCourt && secondCourt) {
      await seedOpenBooking(pool, {
        clubId,
        courtId: firstCourt,
        startsAt: athensStamp(1, 17, 0),
        durationMinutes: duration,
        names: ["Νίκος Παπαδόπουλος", "Μαρία Κωνσταντίνου"],
      });
      await seedOpenBooking(pool, {
        clubId,
        courtId: secondCourt,
        startsAt: athensStamp(1, 17, 0),
        durationMinutes: duration,
        names: ["Αντώνης Λάλας", "Γιώργος Α", "Πέτρος Α"],
      });
    }
    const thirdCourt = courtByName.get(club.courts[2]?.name ?? "") ?? courts.rows[2]?.id;
    if (club.slug === "club-a" && thirdCourt) {
      await seedOpenBooking(pool, {
        clubId,
        courtId: thirdCourt,
        startsAt: athensStamp(1, 15, 30),
        durationMinutes: duration,
        names: ["Γιώργος Α", "Αντώνης Λάλας", "Νίκος Παπαδόπουλος", "Μαρία Κωνσταντίνου"],
      });
    }
    if (club.slug === "club-a") {
      const existingTournament = await pool.query<{ id: string }>(
        "SELECT id FROM tournaments WHERE club_id = $1 LIMIT 1",
        [clubId],
      );
      if (!existingTournament.rows[0]) {
        const preset = club.settings.tournamentPresets[0];
        const created = await pool.query<{ id: string }>(
          `INSERT INTO tournaments (club_id, name, starts_on, format, scoring, status)
           VALUES ($1, $2, $3::date, $4, $5::jsonb, 'open')
           RETURNING id`,
          [
            clubId,
            "Βραδιά Mexicano",
            athensStamp(1, 0, 0).slice(0, 10),
            preset?.format ?? "mexicano",
            JSON.stringify(preset?.scoring ?? { kind: "fixed_points", points: 24 }),
          ],
        );
        const tournamentId = created.rows[0]?.id;
        if (tournamentId) {
          const women = await pool.query<{ id: string }>(
            `INSERT INTO tournament_categories (tournament_id, club_id, name, gender, sort_order)
             VALUES ($1, $2, 'Γυναικών', 'women', 0) RETURNING id`,
            [tournamentId, clubId],
          );
          const mixed = await pool.query<{ id: string }>(
            `INSERT INTO tournament_categories (tournament_id, club_id, name, gender, sort_order)
             VALUES ($1, $2, 'Μικτό', 'mixed_doubles', 1) RETURNING id`,
            [tournamentId, clubId],
          );
          const maria = await playerIdByName(pool, clubId, "Μαρία Κωνσταντίνου");
          const eleni = await playerIdByName(pool, clubId, "Ελένη Β");
          const nikos = await playerIdByName(pool, clubId, "Νίκος Παπαδόπουλος");
          const antonis = await playerIdByName(pool, clubId, "Αντώνης Λάλας");
          const womenIds = [maria, eleni].filter((id): id is string => Boolean(id));
          const mixedIds = [maria, eleni, nikos, antonis].filter((id): id is string => Boolean(id));
          if (women.rows[0]) {
            for (const playerId of womenIds) {
              await pool.query(
                `INSERT INTO tournament_entries (category_id, club_id, player_id) VALUES ($1, $2, $3)`,
                [women.rows[0].id, clubId, playerId],
              );
            }
          }
          if (mixed.rows[0]) {
            for (const playerId of mixedIds) {
              await pool.query(
                `INSERT INTO tournament_entries (category_id, club_id, player_id) VALUES ($1, $2, $3)`,
                [mixed.rows[0].id, clubId, playerId],
              );
            }
          }
        }
      }
    }
    if (club.slug === "club-b" && firstCourt) {
      await seedOpenBooking(pool, {
        clubId,
        courtId: firstCourt,
        startsAt: athensStamp(1, 19, 0),
        durationMinutes: duration,
        names: ["Helen Cole", "Mark Ryan", "Sara Lin"],
      });
    }
  }

  console.log("seeded club-a (3 courts) and club-b (2 courts); roles owner/reception/coach/player");
  await pool.end();
}

seed().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
