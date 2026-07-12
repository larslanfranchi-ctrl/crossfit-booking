-- Manuelle Reihenfolge für Trainings statt alphabetischer Sortierung.
-- Neue Spalte sort_order; Bestand wird anhand der bisherigen (alphabetischen)
-- Reihenfolge fortlaufend nummeriert, damit sich die Anzeige zunächst nicht
-- ändert. Neue Trainings bekommen in der Server Action max(sort_order)+1.

ALTER TABLE trainings ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;

WITH ordered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY name ASC) AS rn
  FROM trainings
)
UPDATE trainings t
SET sort_order = o.rn
FROM ordered o
WHERE t.id = o.id;
