-- RLS-Performance: auth.uid() und is_admin() einmal pro Query statt einmal
-- pro Zeile auswerten.
--
-- Zwei unabhängige Ursachen:
--
-- 1) is_admin() (003) hatte keine Volatilitäts-Angabe und galt damit als
--    VOLATILE - der Default. Postgres muss eine VOLATILE-Funktion für jede
--    geprüfte Zeile erneut ausführen und darf das Ergebnis nicht
--    wiederverwenden. Jede Zeile löste also einen eigenen profiles-Lookup
--    aus. STABLE ist hier korrekt: die Funktion ändert nichts und liefert
--    innerhalb einer Anweisung konstante Ergebnisse.
--
-- 2) Ein nackter Aufruf in einer Policy wird pro Zeile ausgewertet. Als
--    unkorrelierte Subquery - (select auth.uid()) statt auth.uid() - zieht
--    der Planner ihn in einen InitPlan und wertet ihn genau einmal pro Query
--    aus. Semantisch identisch, weil weder auth.uid() noch is_admin() die
--    geprüfte Zeile anfassen.
--
-- Am deutlichsten wirkt das auf bookings und profiles: dort werden Policies
-- über viele Zeilen ausgewertet. Die reinen Stammdaten-Tabellen
-- (course_types, trainings, memberships) bleiben bewusst unangetastet - sie
-- sind winzig und werden nur zeilenweise von Admins geschrieben, dort ist
-- nichts zu gewinnen.
--
-- Sicherheitshinweis: alle Änderungen sind semantisch äquivalent zum
-- Vorzustand. Sollte die Migration mittendrin abbrechen, bleiben die noch
-- nicht angefassten Policies unverändert gültig - es kann also keine Lücke
-- entstehen, nur ein weiterhin langsamer Rest.

-- 1) Volatilität korrigieren. Body unverändert gegenüber 003.
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
$$;

-- 2) Policies auf InitPlan-Form umstellen. ALTER POLICY statt DROP/CREATE,
--    damit es keinen Moment ohne Policy gibt.

-- profiles (008, 016)
ALTER POLICY "Users can view own profile"
ON profiles
USING (id = (SELECT auth.uid()));

ALTER POLICY "Admins can view all profiles"
ON profiles
USING ((SELECT is_admin()));

ALTER POLICY "Users can update own profile"
ON profiles
USING (id = (SELECT auth.uid()))
WITH CHECK (
  id = (SELECT auth.uid())
  AND role = (SELECT role FROM profiles WHERE id = (SELECT auth.uid()))
);

ALTER POLICY "Admins can update any profile"
ON profiles
USING ((SELECT is_admin()))
WITH CHECK ((SELECT is_admin()));

-- bookings (010, INSERT-Policy ersetzt durch 037)
ALTER POLICY "Users can view own bookings, admins view all"
ON bookings
USING (user_id = (SELECT auth.uid()) OR (SELECT is_admin()));

ALTER POLICY "Active users can create own bookings"
ON bookings
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_active
  )
);

ALTER POLICY "Users can cancel own bookings, admins cancel any"
ON bookings
USING (user_id = (SELECT auth.uid()) OR (SELECT is_admin()));

-- user_memberships (038)
ALTER POLICY "Users can view own membership assignments"
ON user_memberships
USING (user_id = (SELECT auth.uid()) OR (SELECT is_admin()));

ALTER POLICY "Admins can insert membership assignments"
ON user_memberships
WITH CHECK ((SELECT is_admin()));

ALTER POLICY "Admins can update membership assignments"
ON user_memberships
USING ((SELECT is_admin()));

ALTER POLICY "Admins can delete membership assignments"
ON user_memberships
USING ((SELECT is_admin()));

-- appointment_slots (009): relevant, weil das Löschen mehrerer Termine auf
-- der Admin-Seite die Policy pro betroffener Zeile auswertet.
ALTER POLICY "Admins can insert slots"
ON appointment_slots
WITH CHECK ((SELECT is_admin()));

ALTER POLICY "Admins can update slots"
ON appointment_slots
USING ((SELECT is_admin()));

ALTER POLICY "Admins can delete slots"
ON appointment_slots
USING ((SELECT is_admin()));

-- Kontrolle nach dem Ausführen: alle betroffenen Policies sollten die
-- Aufrufe jetzt in Klammern als Subquery zeigen, und is_admin() sollte als
-- "s" (stable) gelistet sein.
--
--   SELECT tablename, policyname, qual, with_check
--   FROM pg_policies
--   WHERE schemaname = 'public'
--     AND tablename IN ('profiles','bookings','user_memberships','appointment_slots')
--   ORDER BY tablename, policyname;
--
--   SELECT proname, provolatile FROM pg_proc WHERE proname = 'is_admin';
