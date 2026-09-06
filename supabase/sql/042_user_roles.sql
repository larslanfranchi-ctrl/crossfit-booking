-- Mehrere Rollen pro Nutzer:in (RW-2).
--
-- Bisher war die Rolle ein einzelnes Feld (profiles.role). Wer als
-- Kursleiter:in an einem Termin auswählbar sein sollte, verlor damit die
-- Admin-Rechte - die Kombination "Admin UND Kursleiter:in" war nicht
-- abbildbar. Rollen ziehen deshalb in eine eigene Zuordnungstabelle um.
--
-- profiles.role bleibt vorerst bestehen (Spalte und Trigger-Default), wird
-- vom Anwendungscode aber nicht mehr gelesen. Sie ist damit nur noch ein
-- Überbleibsel für den Fall, dass diese Migration zurückgenommen werden
-- muss; entfernt wird sie erst in einem späteren Aufräum-Skript, zusammen
-- mit der WITH-CHECK-Klausel in "Users can update own profile" (008/041),
-- die sie noch referenziert.

CREATE TABLE user_roles (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'instructor', 'user')),
  PRIMARY KEY (user_id, role)
);

-- Für die Kursleiter:innen-Liste und die Instructor-Sichtbarkeits-Policy:
-- beide fragen nach allen Nutzern EINER Rolle.
CREATE INDEX idx_user_roles_role ON user_roles(role);

-- Datenübernahme: bestehende Rolle übernehmen, zusätzlich bekommt jede
-- Person die Basisrolle 'user'. 'user' ist damit eine echte Rolle, die alle
-- haben (statt "keine Sonderrolle") - das hält die Abfragen einheitlich.
INSERT INTO user_roles (user_id, role)
SELECT id, role FROM profiles
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role)
SELECT id, 'user' FROM profiles
ON CONFLICT DO NOTHING;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Eigene Rollen darf jede:r sehen (der Fallback in getUserRoles() liest sie,
-- solange der Token-Hook den Claim noch nicht liefert), alle Rollen nur
-- Admins. Geschrieben wird ausschliesslich von Admins.
CREATE POLICY "Users can view own roles, admins view all"
ON user_roles FOR SELECT
USING (user_id = (SELECT auth.uid()) OR (SELECT is_admin()));

CREATE POLICY "Admins can grant roles"
ON user_roles FOR INSERT
WITH CHECK ((SELECT is_admin()));

CREATE POLICY "Admins can revoke roles"
ON user_roles FOR DELETE
USING ((SELECT is_admin()));

-- is_admin() liest jetzt user_roles statt profiles.role. SECURITY DEFINER
-- bleibt zwingend: die Funktion wird aus den Policies von user_roles selbst
-- aufgerufen und würde sonst in eine Rekursion mit ihnen laufen (siehe 003).
-- STABLE bleibt ebenfalls, sonst wertet Postgres sie pro geprüfter Zeile neu
-- aus (siehe 041).
CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
$$;

-- Kursleiter-Profile bleiben für alle Angemeldeten sichtbar (Name auf der
-- Termin-Detailseite), jetzt über die Rollentabelle statt profiles.role.
DROP POLICY "Authenticated users can view instructor profiles" ON profiles;

CREATE POLICY "Authenticated users can view instructor profiles"
ON profiles FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM user_roles ur
    WHERE ur.user_id = profiles.id AND ur.role = 'instructor'
  )
);

-- Token-Hook: liefert die Rollen als Array-Claim "user_roles". Der alte
-- Claim "user_role" bleibt zusätzlich befüllt (höchste Rolle), damit bereits
-- ausgestellte Tokens und der Fallback im Proxy weiter funktionieren,
-- solange noch nicht alle Sessions erneuert wurden.
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_roles text[];
  v_role text;
  v_is_active boolean;
BEGIN
  SELECT array_agg(role ORDER BY role) INTO v_roles
  FROM public.user_roles
  WHERE user_id = (event->>'user_id')::uuid;

  SELECT is_active INTO v_is_active
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  v_role := CASE
    WHEN 'admin' = ANY(COALESCE(v_roles, '{}')) THEN 'admin'
    WHEN 'instructor' = ANY(COALESCE(v_roles, '{}')) THEN 'instructor'
    ELSE 'user'
  END;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_roles}', COALESCE(to_jsonb(v_roles), '[]'::jsonb));
  claims := jsonb_set(claims, '{user_role}', to_jsonb(v_role));
  claims := jsonb_set(claims, '{user_is_active}', COALESCE(to_jsonb(v_is_active), 'true'::jsonb));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Der Hook läuft als supabase_auth_admin und braucht deshalb - wie schon für
-- profiles (035) - Lese-Zugriff auf die neue Tabelle.
GRANT SELECT ON public.user_roles TO supabase_auth_admin;

CREATE POLICY "Auth admin can read roles for token hook"
ON public.user_roles FOR SELECT
TO supabase_auth_admin
USING (true);

-- Neu registrierte Nutzer:innen bekommen die Basisrolle 'user' direkt beim
-- Anlegen des Profils - sonst hätten sie nach der Umstellung gar keine Rolle.
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, first_name, last_name)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name'
  );

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- Aussperrschutz (017/037), aufgeteilt auf die zwei Stellen, an denen ein
-- Konto seine Admin-Rechte verlieren kann:
--
--  1) Die Admin-Rolle wird entzogen  -> Trigger auf user_roles (neu)
--  2) Das Konto wird deaktiviert     -> Trigger auf profiles (angepasst)
--
-- In beiden Fällen zählt nur, ob danach noch mindestens ein AKTIVER Admin
-- übrig bleibt.
CREATE OR REPLACE FUNCTION prevent_last_admin_role_revoke()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_admins integer;
BEGIN
  IF OLD.role = 'admin' THEN
    SELECT COUNT(*) INTO remaining_admins
    FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.role = 'admin' AND p.is_active AND ur.user_id <> OLD.user_id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Der letzte aktive Admin kann die Admin-Rolle nicht verlieren.';
    END IF;
  END IF;

  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_prevent_last_admin_role_revoke
BEFORE DELETE ON user_roles
FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_role_revoke();

-- Der bestehende profiles-Trigger prüfte OLD.role/NEW.role mit; die Rolle
-- ändert sich dort jetzt nicht mehr, übrig bleibt der Deaktivierungsfall.
CREATE OR REPLACE FUNCTION prevent_last_admin_demotion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_admins integer;
BEGIN
  IF OLD.is_active AND NOT NEW.is_active
     AND EXISTS (
       SELECT 1 FROM user_roles
       WHERE user_id = OLD.id AND role = 'admin'
     ) THEN
    SELECT COUNT(*) INTO remaining_admins
    FROM user_roles ur
    JOIN profiles p ON p.id = ur.user_id
    WHERE ur.role = 'admin' AND p.is_active AND ur.user_id <> OLD.id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Der letzte aktive Admin kann nicht deaktiviert werden.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Nutzerliste für die Admin-Verwaltung liefert jetzt alle Rollen als Array.
-- DROP statt CREATE OR REPLACE, weil sich der Rückgabetyp ändert.
DROP FUNCTION get_all_users_with_email();

CREATE FUNCTION get_all_users_with_email()
RETURNS TABLE (id uuid, full_name text, email text, roles text[], is_active boolean)
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
    COALESCE(
      (SELECT array_agg(ur.role ORDER BY ur.role)
         FROM user_roles ur WHERE ur.user_id = p.id),
      '{}'::text[]
    ) AS roles,
    p.is_active
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.first_name;
END;
$$;

GRANT EXECUTE ON FUNCTION get_all_users_with_email() TO authenticated;

-- Kontrolle nach dem Ausführen:
--
--   SELECT ur.role, count(*) FROM user_roles ur GROUP BY 1;
--   -- muss mindestens einen aktiven Admin zeigen:
--   SELECT p.id FROM user_roles ur JOIN profiles p ON p.id = ur.user_id
--   WHERE ur.role = 'admin' AND p.is_active;
