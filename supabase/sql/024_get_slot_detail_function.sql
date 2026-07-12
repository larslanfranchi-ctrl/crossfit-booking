-- SECURITY DEFINER RPC, analog zu get_all_users_with_email() - liefert
-- gezielt nur Kursleiter-Name + Teilnehmer-Namen für einen Termin, ohne
-- Telefonnummer/E-Mail/sonstige profiles-Spalten preiszugeben. Bewusst ohne
-- Admin-Check aufrufbar, da die Teilnehmerliste jetzt für alle Nutzer
-- sichtbar sein soll.
CREATE OR REPLACE FUNCTION get_slot_detail(p_slot_id bigint)
RETURNS TABLE (instructor_name text, participant_names text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT p.full_name FROM appointment_slots s
       JOIN profiles p ON p.id = s.instructor_id WHERE s.id = p_slot_id),
    (SELECT array_agg(pr.full_name ORDER BY pr.full_name) FROM bookings b
       JOIN profiles pr ON pr.id = b.user_id WHERE b.slot_id = p_slot_id);
END;
$$;

GRANT EXECUTE ON FUNCTION get_slot_detail(bigint) TO authenticated;
