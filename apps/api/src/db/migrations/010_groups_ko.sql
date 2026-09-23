CREATE TABLE IF NOT EXISTS tournament_group_teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  group_index INT NOT NULL,
  seed INT NOT NULL,
  a1 UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  a2 UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS tournament_group_teams_category_idx
  ON tournament_group_teams (category_id);

ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS stage TEXT NOT NULL DEFAULT 'pair';

ALTER TABLE tournament_matches
  ADD COLUMN IF NOT EXISTS group_index INT;
