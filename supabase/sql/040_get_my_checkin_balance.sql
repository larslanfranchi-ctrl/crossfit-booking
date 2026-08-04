-- Anzeige-Pendant zu enforce_checkin_limit (039): liefert das verbleibende
-- Check-in-Kontingent des eingeloggten Nutzers direkt aus der Datenbank.
--
-- Vorher zählte die App in TypeScript: sie lud *alle* Buchungen des Nutzers
-- plus die zugehörigen Termine und filterte erst danach auf das relevante
-- Fenster. Der Aufwand wuchs damit mit der gesamten Mitgliedschaftsdauer,
-- obwohl am Ende nur eine einzige Zahl angezeigt wird.
--
-- Die Zählweise ist bewusst identisch zu 039 (gleiche Fenster, gleiche
-- Zeitzone Europe/Zurich), damit Anzeige und Durchsetzung nicht auseinander-
-- laufen. Die TypeScript-Variante rechnete in der Server-Zeitzone (auf Vercel
-- UTC) und konnte am Wochenrand eine andere Kalenderwoche treffen als der
-- Trigger - das ist hiermit ebenfalls behoben.
--
-- SECURITY INVOKER (Standard): die Funktion läuft mit den Rechten des
-- aufrufenden Nutzers. Die RLS-Policies von user_memberships und bookings
-- geben genau die eigenen Zeilen frei, mehr wird nicht gebraucht.

CREATE OR REPLACE FUNCTION get_my_checkin_balance()
RETURNS TABLE (kind text, remaining integer, period text)
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
  today date := (now() AT TIME ZONE 'Europe/Zurich')::date;
  has_abo boolean := false;
  assignment record;
  used integer;
  candidate integer;
  best integer := NULL;
  best_period text := NULL;
BEGIN
  -- Bei mehreren gültigen Abos zählt das mit dem größten Restkontingent -
  -- gebucht werden darf, sobald EIN Abo noch Guthaben hat (wie in 039).
  FOR assignment IN
    SELECT um.starts_on, um.ends_on, m.checkin_limit, m.checkin_period
    FROM user_memberships um
    JOIN memberships m ON m.id = um.membership_id
    WHERE um.user_id = auth.uid()
      AND um.starts_on <= today
      AND (um.ends_on IS NULL OR um.ends_on >= today)
  LOOP
    has_abo := true;

    IF assignment.checkin_limit IS NULL THEN
      RETURN QUERY SELECT 'unlimited'::text, NULL::integer, NULL::text;
      RETURN;
    END IF;

    IF assignment.checkin_period = 'week' THEN
      SELECT COUNT(*) INTO used
      FROM bookings b
      JOIN appointment_slots s ON s.id = b.slot_id
      WHERE b.user_id = auth.uid()
        AND date_trunc('week', s.start_time AT TIME ZONE 'Europe/Zurich')
          = date_trunc('week', now() AT TIME ZONE 'Europe/Zurich');
    ELSE
      SELECT COUNT(*) INTO used
      FROM bookings b
      JOIN appointment_slots s ON s.id = b.slot_id
      WHERE b.user_id = auth.uid()
        AND (s.start_time AT TIME ZONE 'Europe/Zurich')::date >= assignment.starts_on
        AND (assignment.ends_on IS NULL
          OR (s.start_time AT TIME ZONE 'Europe/Zurich')::date <= assignment.ends_on);
    END IF;

    candidate := GREATEST(0, assignment.checkin_limit - used);
    IF best IS NULL OR candidate > best THEN
      best := candidate;
      best_period := assignment.checkin_period;
    END IF;
  END LOOP;

  IF NOT has_abo THEN
    RETURN QUERY SELECT 'none'::text, NULL::integer, NULL::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT 'limited'::text, best, best_period;
END;
$$;

GRANT EXECUTE ON FUNCTION get_my_checkin_balance() TO authenticated;
