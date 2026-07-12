ALTER TABLE profiles
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT,
  ADD COLUMN address_street TEXT,
  ADD COLUMN address_zip TEXT,
  ADD COLUMN address_city TEXT,
  ADD COLUMN birth_date DATE;

-- Best-Effort-Trennung des bisherigen full_name in Vor-/Nachname. Der
-- Datenbestand ist klein (Testdaten), eine verlustfreie Trennung ist ohnehin
-- nicht allgemein möglich - danach wird full_name entfernt.
UPDATE profiles SET
  first_name = CASE
    WHEN position(' ' IN full_name) > 0 THEN split_part(full_name, ' ', 1)
    ELSE full_name
  END,
  last_name = CASE
    WHEN position(' ' IN full_name) > 0
      THEN substring(full_name FROM position(' ' IN full_name) + 1)
    ELSE NULL
  END
WHERE full_name IS NOT NULL;

ALTER TABLE profiles DROP COLUMN full_name;
