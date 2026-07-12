-- Entfernt das Attribut "Level" vollständig aus dem Datenmodell.
--
-- Reihenfolge ist wichtig: Die View slot_availability referenziert
-- appointment_slots.level_id, daher muss sie zuerst weichen, bevor die Spalte
-- gelöscht werden kann. Danach wird die View ohne level neu angelegt und
-- zuletzt die (dann nicht mehr referenzierte) Tabelle levels samt ihrer
-- RLS-Policies entfernt (Policies werden mit DROP TABLE automatisch mitgelöscht).

DROP VIEW slot_availability;

ALTER TABLE appointment_slots DROP COLUMN level_id;

CREATE VIEW slot_availability AS
SELECT
  s.id,
  s.start_time,
  s.end_time,
  s.capacity,
  COUNT(b.id) AS booked_count,
  s.course_type_id
FROM appointment_slots s
LEFT JOIN bookings b ON b.slot_id = s.id
GROUP BY s.id, s.start_time, s.end_time, s.capacity, s.course_type_id;

DROP TABLE levels;
