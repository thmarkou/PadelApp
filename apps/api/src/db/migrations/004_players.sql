CREATE TABLE IF NOT EXISTS players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  phone TEXT,
  email TEXT,
  self_level NUMERIC,
  confirmed_level NUMERIC,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS players_club_name_idx
  ON players (club_id, lower(display_name));

ALTER TABLE booking_spots
  ADD COLUMN IF NOT EXISTS player_id UUID REFERENCES players(id) ON DELETE SET NULL;

ALTER TABLE booking_spots
  ADD COLUMN IF NOT EXISTS added_by UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS bookings_confirmed_slot_idx
  ON bookings (club_id, court_id, starts_at)
  WHERE status = 'confirmed';
