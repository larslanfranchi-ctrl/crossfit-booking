CREATE OR REPLACE FUNCTION get_slot_detail(p_slot_id bigint)
RETURNS TABLE (instructor_name text, participant_names text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT NULLIF(trim(concat(p.first_name, ' ', coalesce(p.last_name, ''))), '')
       FROM appointment_slots s
       JOIN profiles p ON p.id = s.instructor_id WHERE s.id = p_slot_id),
    (SELECT array_agg(
        NULLIF(trim(concat(pr.first_name, ' ', coalesce(pr.last_name, ''))), '')
        ORDER BY pr.first_name
      ) FROM bookings b
       JOIN profiles pr ON pr.id = b.user_id WHERE b.slot_id = p_slot_id);
END;
$$;
