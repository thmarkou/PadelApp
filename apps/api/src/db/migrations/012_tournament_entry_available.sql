ALTER TABLE IF EXISTS tournament_entry_blocks
  RENAME TO tournament_entry_available;

DELETE FROM tournament_entry_available;
UPDATE tournament_entries SET available_all = TRUE;
