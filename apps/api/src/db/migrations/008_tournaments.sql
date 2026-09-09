CREATE TABLE IF NOT EXISTS tournaments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  starts_on DATE NOT NULL,
  format TEXT NOT NULL,
  scoring JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('draft', 'open', 'running', 'closed')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tournaments_club_idx ON tournaments (club_id, starts_on);

CREATE TABLE IF NOT EXISTS tournament_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('men', 'women', 'mixed_doubles')),
  min_age INT,
  max_age INT,
  min_level NUMERIC,
  max_level NUMERIC,
  sort_order INT NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS tournament_categories_tournament_idx
  ON tournament_categories (tournament_id);

CREATE TABLE IF NOT EXISTS tournament_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, player_id)
);

CREATE TABLE IF NOT EXISTS tournament_rounds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  number INT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (category_id, number)
);

CREATE TABLE IF NOT EXISTS tournament_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  round_id UUID NOT NULL REFERENCES tournament_rounds(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES tournament_categories(id) ON DELETE CASCADE,
  club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
  court_index INT NOT NULL,
  a1 UUID REFERENCES players(id) ON DELETE SET NULL,
  a2 UUID REFERENCES players(id) ON DELETE SET NULL,
  b1 UUID REFERENCES players(id) ON DELETE SET NULL,
  b2 UUID REFERENCES players(id) ON DELETE SET NULL,
  score_a INT,
  score_b INT
);
