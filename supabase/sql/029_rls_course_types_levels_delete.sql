-- Löschen bleibt für Admins erlaubt; die bestehende FK
-- (appointment_slots.course_type_id/level_id REFERENCES ... ohne ON DELETE)
-- verhindert weiterhin, dass eine noch verwendete Kursart/ein Level gelöscht
-- wird (Postgres wirft einen Fremdschlüssel-Fehler) - das fängt die
-- Server Action ab und zeigt stattdessen eine verständliche Meldung.
CREATE POLICY "Admins can delete course types"
ON course_types FOR DELETE
USING (is_admin());

CREATE POLICY "Admins can delete levels"
ON levels FOR DELETE
USING (is_admin());
