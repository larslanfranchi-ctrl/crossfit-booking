-- SECURITY DEFINER: läuft mit den Rechten des Funktions-Eigentümers und umgeht
-- damit die RLS-Policy von "profiles", die selbst is_admin() aufruft. Ohne das
-- würde die Prüfung "select role from profiles" in eine unendliche Rekursion
-- mit der eigenen RLS-Policy laufen.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;
