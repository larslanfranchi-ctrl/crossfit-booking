-- Rückgabe-Spalte heißt weiterhin "full_name" (Konsumenten in TypeScript
-- bleiben unverändert), wird jetzt aber aus first_name/last_name berechnet.
CREATE OR REPLACE FUNCTION get_all_users_with_email()
RETURNS TABLE (id uuid, full_name text, email text, role text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Nur Admins dürfen die Nutzerliste abrufen.';
  END IF;

  RETURN QUERY
  SELECT
    p.id,
    NULLIF(trim(concat(p.first_name, ' ', coalesce(p.last_name, ''))), '') AS full_name,
    u.email::text,
    p.role
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.first_name;
END;
$$;
