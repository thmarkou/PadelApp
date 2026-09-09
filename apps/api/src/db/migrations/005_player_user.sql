ALTER TABLE players
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS players_club_user_idx
  ON players (club_id, user_id)
  WHERE user_id IS NOT NULL;
