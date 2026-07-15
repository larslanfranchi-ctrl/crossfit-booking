-- Nutzer-Deaktivierung: Admins können Konten sperren, ohne sie zu löschen -
-- die Buchungshistorie bleibt erhalten und das Konto kann jederzeit wieder
-- aktiviert werden (z.B. bei ausgelaufenem Abo).

ALTER TABLE profiles ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;

-- Der Custom Access Token Hook (035) schreibt zusätzlich zum "user_role"-
-- Claim jetzt auch "user_is_active" ins JWT - der Proxy sperrt deaktivierte
-- Nutzer damit ohne DB-Roundtrip aus. Wie bei Rollenänderungen wirkt eine
-- Deaktivierung im JWT erst nach dem nächsten Token-Refresh (max. 1 Stunde);
-- das Buchen ist deshalb zusätzlich sofort per RLS gesperrt (siehe unten).
CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_role text;
  v_is_active boolean;
BEGIN
  SELECT role, is_active INTO v_role, v_is_active
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', COALESCE(to_jsonb(v_role), 'null'::jsonb));
  claims := jsonb_set(claims, '{user_is_active}', COALESCE(to_jsonb(v_is_active), 'true'::jsonb));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Letzter-Admin-Schutz (017) erweitert: neben der Herabstufung ist jetzt auch
-- die Deaktivierung des letzten aktiven Admins gesperrt - sonst könnte danach
-- niemand mehr Konten reaktivieren oder Rollen vergeben.
CREATE OR REPLACE FUNCTION prevent_last_admin_demotion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_admins integer;
BEGIN
  IF OLD.role = 'admin' AND OLD.is_active
     AND (NEW.role <> 'admin' OR NOT NEW.is_active) THEN
    SELECT COUNT(*) INTO remaining_admins
    FROM profiles
    WHERE role = 'admin' AND is_active AND id <> OLD.id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Der letzte aktive Admin kann nicht herabgestuft oder deaktiviert werden.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Buchen sofort sperren (unabhängig vom JWT-Claim): die INSERT-Policy aus
-- 010 prüft zusätzlich, dass das eigene Profil aktiv ist. Stornieren bleibt
-- erlaubt - ein deaktivierter Nutzer soll seine Plätze freigeben können.
DROP POLICY "Users can create own bookings" ON bookings;

CREATE POLICY "Active users can create own bookings"
ON bookings FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND is_active)
);

-- Nutzerliste für die Admin-Verwaltung liefert den Aktiv-Status mit.
-- DROP statt CREATE OR REPLACE, weil sich der Rückgabetyp ändert.
DROP FUNCTION get_all_users_with_email();

CREATE FUNCTION get_all_users_with_email()
RETURNS TABLE (id uuid, full_name text, email text, role text, is_active boolean)
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
    p.role,
    p.is_active
  FROM profiles p
  JOIN auth.users u ON u.id = p.id
  ORDER BY p.first_name;
END;
$$;
