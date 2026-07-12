-- Liefert alle Nutzer inkl. E-Mail (aus auth.users, das normale Clients
-- nicht direkt abfragen können) für die Admin-Nutzerliste (US-19). Der
-- Admin-Check läuft innerhalb der Funktion (SECURITY DEFINER), damit kein
-- direkter GRANT auf auth.users nötig ist.
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
  SELECT p.id, p.full_name, u.email::text, p.role
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.full_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users_with_email() TO authenticated;
