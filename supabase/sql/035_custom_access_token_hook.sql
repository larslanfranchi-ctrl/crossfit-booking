-- Custom Access Token Hook: schreibt die App-Rolle (profiles.role) beim
-- Ausstellen jedes Access Tokens als Claim "user_role" ins JWT. Proxy und
-- Layout lesen die Rolle dann direkt aus dem Token statt bei jedem Request
-- die profiles-Tabelle abzufragen (spart einen DB-Roundtrip pro Navigation).
--
-- Einmalige Schritte nach dem Ausführen dieses Skripts:
--
--  1. Dashboard -> Authentication -> Hooks -> "Custom Access Token"
--     aktivieren und die Funktion public.custom_access_token_hook auswählen.
--
--  2. Damit auth.getClaims() das JWT LOKAL validieren kann (statt per
--     Netzwerk-Roundtrip zum Auth-Server): Dashboard -> Project Settings ->
--     JWT Keys -> auf asymmetrische Signing Keys (ECC P-256) migrieren.
--     Ohne diesen Schritt funktioniert der Code weiter, getClaims() fällt
--     dann nur intern auf die Server-Validierung zurück.
--
-- Hinweis: Rollenänderungen (z.B. Admin-Ernennung) wirken im JWT erst nach
-- dem nächsten Token-Refresh (max. Token-Laufzeit, Standard 1 Stunde). Der
-- Code hat dafür einen Fallback auf die profiles-Query, solange der Claim
-- fehlt - der Hook kann also gefahrlos später aktiviert werden.

CREATE OR REPLACE FUNCTION public.custom_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
  claims jsonb;
  v_role text;
BEGIN
  SELECT role INTO v_role
  FROM public.profiles
  WHERE id = (event->>'user_id')::uuid;

  claims := event->'claims';
  claims := jsonb_set(claims, '{user_role}', COALESCE(to_jsonb(v_role), 'null'::jsonb));

  RETURN jsonb_set(event, '{claims}', claims);
END;
$$;

-- Der Hook läuft als supabase_auth_admin - diese Rolle braucht Zugriff auf
-- die Funktion und Lesezugriff auf profiles (RLS gilt auch für sie).
GRANT USAGE ON SCHEMA public TO supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.custom_access_token_hook TO supabase_auth_admin;
REVOKE EXECUTE ON FUNCTION public.custom_access_token_hook FROM authenticated, anon, public;

GRANT SELECT ON public.profiles TO supabase_auth_admin;

CREATE POLICY "Auth admin can read profiles for token hook"
ON public.profiles FOR SELECT
TO supabase_auth_admin
USING (true);
