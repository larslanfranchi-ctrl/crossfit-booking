-- Workout direkt am Termin (RW-3).
--
-- Bisher lag der Workout-Text in der Stammdatenliste "trainings" und wurde
-- über appointment_slots.training_id am Termin verknüpft: erst benennen und
-- anlegen, dann verknüpfen - zwei getrennte Orte, entkoppelt vom Kalendertag.
-- Der Inhalt zieht deshalb an den Termin selbst um; gepflegt wird er künftig
-- unter /admin/workouts (Tag öffnen -> Kurs wählen -> Workout schreiben).
--
-- Diese Migration ist bewusst additiv: trainings und training_id bleiben
-- unangetastet, damit die alten Inhalte nach dem Deployment noch als Kopie
-- vorliegen. Das Aufräumen erledigt 044_drop_trainings.sql.example, sobald
-- die neue Ansicht produktiv läuft.

ALTER TABLE appointment_slots ADD COLUMN workout_content TEXT;

-- Datenübernahme: der Inhalt des verknüpften Trainings wandert an den Slot.
-- Der Name des Trainings entfällt - die Detailseite zeigt als Überschrift
-- ohnehin die Kursart, und ein separater Workout-Titel war nie Pflichtfeld.
UPDATE appointment_slots s
SET workout_content = t.content
FROM trainings t
WHERE t.id = s.training_id
  AND t.content IS NOT NULL
  AND s.workout_content IS NULL;

-- Kontrolle nach dem Ausführen (beide Zahlen sollten übereinstimmen):
--
--   SELECT count(*) FROM appointment_slots s JOIN trainings t
--     ON t.id = s.training_id WHERE t.content IS NOT NULL;
--   SELECT count(*) FROM appointment_slots WHERE workout_content IS NOT NULL;
