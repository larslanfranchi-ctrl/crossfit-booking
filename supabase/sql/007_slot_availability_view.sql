-- Aggregierte, für alle authentifizierten Nutzer lesbare Sicht auf die
-- Belegung eines Slots (nur die Anzahl, keine Teilnehmer-Identitäten). Die
-- View läuft mit den Rechten ihres Eigentümers (Standard-Verhalten, kein
-- "security_invoker"), umgeht also die strengere RLS-Policy von "bookings"
-- (die nur eigene Zeilen bzw. Admins erlaubt) - genau das ist hier gewollt,
-- damit jeder Nutzer die Restplätze sieht, ohne zu erfahren, wer sonst noch
-- gebucht hat.
CREATE VIEW slot_availability AS
SELECT
  s.id,
  s.start_time,
  s.end_time,
  s.capacity,
  COUNT(b.id) AS booked_count
FROM appointment_slots s
LEFT JOIN bookings b ON b.slot_id = s.id
GROUP BY s.id, s.start_time, s.end_time, s.capacity;

GRANT SELECT ON slot_availability TO authenticated;
