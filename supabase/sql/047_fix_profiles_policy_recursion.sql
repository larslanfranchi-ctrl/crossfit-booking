-- VB-4: "infinite recursion detected in policy for relation profiles" bei
-- jedem UPDATE auf profiles (Deaktivieren durch Admins, aber auch "Meine
-- Daten" speichern).
--
-- Ursache: Die WITH-CHECK-Klausel von "Users can update own profile" (008,
-- Form aus 041) liest selbst aus profiles, um die eigene Rolle zu sperren.
-- Postgres wendet auf diese innere Abfrage wieder die SELECT-Policies von
-- profiles an. Seit 041/042 enthalten die Subqueries ((SELECT is_admin()),
-- EXISTS auf user_roles) - und eine Policy mit Subquery auf einer Tabelle,
-- die gerade schon expandiert wird, bricht Postgres als Rekursion ab. Vor
-- 041 gab es dort keine Subqueries, deshalb lief es früher.
--
-- Lösung: die Policy fragt profiles nicht mehr ab. Was sie schützen sollte
-- (Nutzer:innen ändern ihre Rolle nicht selbst), übernimmt ein Trigger, der
-- OLD und NEW direkt vergleicht und keine Abfrage braucht. Er sperrt
-- zusätzlich is_active - bisher hätte sich ein deaktiviertes Konto über die
-- API selbst wieder aktivieren können.

ALTER POLICY "Users can update own profile"
ON profiles
USING (id = (SELECT auth.uid()))
WITH CHECK (id = (SELECT auth.uid()));

-- Nur Anfragen über die API (Rolle authenticated) werden geprüft. Der
-- SQL-Editor, der Token-Hook und SECURITY-DEFINER-Funktionen laufen unter
-- anderen Rollen und bleiben unberührt.
CREATE OR REPLACE FUNCTION protect_profile_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF current_user = 'authenticated'
     AND (NEW.role IS DISTINCT FROM OLD.role
          OR NEW.is_active IS DISTINCT FROM OLD.is_active)
     AND NOT is_admin() THEN
    RAISE EXCEPTION 'Rolle und Aktiv-Status können nur Admins ändern.';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_protect_profile_admin_fields
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION protect_profile_admin_fields();

-- Kontrolle nach dem Ausführen:
--
--   -- WITH CHECK darf profiles nicht mehr enthalten, nur noch die uid-Prüfung:
--   SELECT policyname, with_check FROM pg_policies
--   WHERE tablename = 'profiles' AND cmd = 'UPDATE';
--
--   SELECT tgname FROM pg_trigger
--   WHERE tgrelid = 'profiles'::regclass AND NOT tgisinternal;
