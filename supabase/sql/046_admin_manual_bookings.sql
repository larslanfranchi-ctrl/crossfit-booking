-- VB-2: Admins buchen Personen manuell auf einen Termin.
--
-- Fachlich entschieden: die manuelle Buchung geht auch dann durch, wenn die
-- Person kein aktives Abo hat oder der Kurs schon voll ist - der Admin darf
-- bewusst über die Kapazität hinausgehen.
--
-- Umgesetzt über eine neue Spalte booked_by statt über eine Rollenprüfung in
-- den Triggern: die Trigger laufen mit den Rechten des Aufrufers, und ein
-- Service-Role-Client (der RLS umgeht) hätte dort kein auth.uid(). Die Spalte
-- ist ausserdem die Spur, wer die Buchung veranlasst hat - bei einer
-- Überbuchung will man das später nachsehen können.
--
-- Wer booked_by setzen darf, entscheidet allein RLS: Selbstbuchungen müssen
-- booked_by IS NULL haben, die neue Admin-Policy verlangt booked_by =
-- auth.uid() plus is_admin(). Ein normaler Nutzer kann sich die Umgehung der
-- Trigger also nicht selbst ausstellen.

ALTER TABLE bookings
  ADD COLUMN booked_by UUID REFERENCES profiles(id) ON DELETE SET NULL;

COMMENT ON COLUMN bookings.booked_by IS
  'NULL = selbst gebucht. Sonst der Admin, der die Person manuell hinzugebucht hat; umgeht Kapazitäts- und Kontingentprüfung.';

-- Selbstbuchung: unverändert (037, Form aus 041), zusätzlich darf dabei kein
-- booked_by gesetzt werden.
ALTER POLICY "Active users can create own bookings"
ON bookings
WITH CHECK (
  user_id = (SELECT auth.uid())
  AND booked_by IS NULL
  AND EXISTS (
    SELECT 1 FROM profiles WHERE id = (SELECT auth.uid()) AND is_active
  )
);

-- Manuelle Buchung durch einen Admin, für beliebige user_id.
CREATE POLICY "Admins can book anyone manually"
ON bookings FOR INSERT
WITH CHECK (
  (SELECT is_admin())
  AND booked_by = (SELECT auth.uid())
);

-- Kapazitätsprüfung (006): bei manueller Buchung übersprungen. Body sonst
-- unverändert.
CREATE OR REPLACE FUNCTION enforce_slot_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
  slot_capacity integer;
BEGIN
  IF NEW.booked_by IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT capacity INTO slot_capacity
  FROM appointment_slots
  WHERE id = NEW.slot_id
  FOR UPDATE;

  SELECT COUNT(*) INTO current_count
  FROM bookings
  WHERE slot_id = NEW.slot_id;

  IF current_count >= slot_capacity THEN
    RAISE EXCEPTION 'Dieser Termin ist bereits ausgebucht.';
  END IF;

  RETURN NEW;
END;
$$;

-- Kontingentprüfung (039): dito. Body sonst unverändert.
CREATE OR REPLACE FUNCTION enforce_checkin_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_role text;
  slot_start timestamptz;
  slot_day date;
  has_abo boolean := false;
  has_quota boolean := false;
  quota_message text := 'Dein Check-in-Kontingent ist aufgebraucht.';
  assignment record;
  used integer;
BEGIN
  IF NEW.booked_by IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT role INTO v_role FROM profiles WHERE id = NEW.user_id;
  IF v_role IN ('admin', 'instructor') THEN
    RETURN NEW;
  END IF;

  -- Gleichzeitige Buchungen desselben Nutzers serialisieren, damit zwei
  -- parallele Inserts das Kontingent nicht gemeinsam überschreiten können
  -- (gleiches Prinzip wie die Slot-Sperre in 006).
  PERFORM 1 FROM profiles WHERE id = NEW.user_id FOR UPDATE;

  SELECT start_time INTO slot_start
  FROM appointment_slots
  WHERE id = NEW.slot_id;

  slot_day := (slot_start AT TIME ZONE 'Europe/Zurich')::date;

  -- Gebucht werden darf, sobald EIN aktives Abo noch Kontingent hat.
  FOR assignment IN
    SELECT um.starts_on, um.ends_on, m.checkin_limit, m.checkin_period
    FROM user_memberships um
    JOIN memberships m ON m.id = um.membership_id
    WHERE um.user_id = NEW.user_id
      AND um.starts_on <= slot_day
      AND (um.ends_on IS NULL OR um.ends_on >= slot_day)
  LOOP
    has_abo := true;

    IF assignment.checkin_limit IS NULL THEN
      has_quota := true;
      EXIT;
    END IF;

    IF assignment.checkin_period = 'week' THEN
      SELECT COUNT(*) INTO used
      FROM bookings b
      JOIN appointment_slots s ON s.id = b.slot_id
      WHERE b.user_id = NEW.user_id
        AND date_trunc('week', s.start_time AT TIME ZONE 'Europe/Zurich')
          = date_trunc('week', slot_start AT TIME ZONE 'Europe/Zurich');

      IF used < assignment.checkin_limit THEN
        has_quota := true;
        EXIT;
      END IF;
      quota_message := 'Dein wöchentliches Check-in-Kontingent ist aufgebraucht.';
    ELSE
      SELECT COUNT(*) INTO used
      FROM bookings b
      JOIN appointment_slots s ON s.id = b.slot_id
      WHERE b.user_id = NEW.user_id
        AND (s.start_time AT TIME ZONE 'Europe/Zurich')::date >= assignment.starts_on
        AND (assignment.ends_on IS NULL
          OR (s.start_time AT TIME ZONE 'Europe/Zurich')::date <= assignment.ends_on);

      IF used < assignment.checkin_limit THEN
        has_quota := true;
        EXIT;
      END IF;
    END IF;
  END LOOP;

  IF NOT has_abo THEN
    RAISE EXCEPTION 'Kein aktives Abo für diesen Termin.';
  END IF;

  IF NOT has_quota THEN
    RAISE EXCEPTION '%', quota_message;
  END IF;

  RETURN NEW;
END;
$$;

-- Kontrolle nach dem Ausführen:
--
--   -- Spalte und Policies vorhanden?
--   SELECT column_name FROM information_schema.columns
--   WHERE table_name = 'bookings' AND column_name = 'booked_by';
--
--   SELECT policyname, with_check FROM pg_policies
--   WHERE tablename = 'bookings' AND cmd = 'INSERT';
--
--   -- Bestandsbuchungen bleiben Selbstbuchungen (muss 0 liefern):
--   SELECT count(*) FROM bookings WHERE booked_by IS NOT NULL;
