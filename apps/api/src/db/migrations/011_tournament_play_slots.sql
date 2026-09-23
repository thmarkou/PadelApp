CREATE TABLE IF NOT EXISTS tournament_play_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  play_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  sort_order INT NOT NULL
);

CREATE INDEX IF NOT EXISTS tournament_play_slots_tour_idx
  ON tournament_play_slots (tournament_id, play_date, sort_order);

ALTER TABLE tournament_entries
  ADD COLUMN IF NOT EXISTS available_all BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE IF NOT EXISTS tournament_entry_blocks (
  entry_id UUID NOT NULL REFERENCES tournament_entries(id) ON DELETE CASCADE,
  slot_id UUID NOT NULL REFERENCES tournament_play_slots(id) ON DELETE CASCADE,
  PRIMARY KEY (entry_id, slot_id)
);
