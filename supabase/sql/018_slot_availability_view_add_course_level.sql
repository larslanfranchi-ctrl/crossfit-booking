-- CREATE OR REPLACE VIEW mit angehängten Spalten ist abwärtskompatibel
-- (bestehende Konsumenten, die per Spaltenname zugreifen, sind nicht
-- betroffen) - kein DROP VIEW nötig.
CREATE OR REPLACE VIEW slot_availability AS
SELECT
  s.id,
  s.start_time,
  s.end_time,
  s.capacity,
  COUNT(b.id) AS booked_count,
  s.course_type_id,
  s.level_id
FROM appointment_slots s
LEFT JOIN bookings b ON b.slot_id = s.id
GROUP BY s.id, s.start_time, s.end_time, s.capacity, s.course_type_id, s.level_id;
