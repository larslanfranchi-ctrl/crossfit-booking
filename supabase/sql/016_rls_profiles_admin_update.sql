-- Koexistiert mit der bestehenden "eigene Zeile, Rolle gesperrt"-Policy aus
-- 008_rls_profiles.sql (RLS-Policies für denselben Befehl werden ODER-
-- verknüpft) - normale Nutzer bleiben weiterhin auf ihre eigene Zeile
-- beschränkt und können ihre eigene Rolle nicht ändern, während Admins über
-- diese Policy beliebige Profile inkl. Rolle ändern können (nötig für die
-- Admin-Rollenvergabe per Schalter, US-19).
CREATE POLICY "Admins can update any profile"
ON profiles FOR UPDATE
USING (is_admin())
WITH CHECK (is_admin());
