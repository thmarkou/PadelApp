ALTER TABLE players
  ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female'));

ALTER TABLE players
  ADD COLUMN IF NOT EXISTS birth_year INT CHECK (birth_year IS NULL OR (birth_year >= 1930 AND birth_year <= 2100));
