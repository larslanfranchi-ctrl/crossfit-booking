-- Check-in-Limits durchsetzen: Buchen erfordert ein aktives Abo mit freiem
-- Kontingent. Das Freitext-Feld check_ins (036) bleibt die Anzeige; für die
-- Durchsetzung bekommen die Abos zwei strukturierte Felder:
--   checkin_limit  - Anzahl Check-ins, NULL = unbegrenzt
--   checkin_period - 'total' (für die gesamte Abo-Laufzeit) oder 'week'
-- Admins und Kursleiter:innen buchen ohne Abo-Prüfung.

ALTER TABLE memberships ADD COLUMN checkin_limit INTEGER;
ALTER TABLE memberships ADD COLUMN checkin_period TEXT NOT NULL DEFAULT 'total'
  CHECK (checkin_period IN ('total', 'week'));

-- Backfill aus dem bestehenden Anzeigetext ("10 Check-ins",
-- "Unbegrenzte Check-ins", "2 Check-ins pro Woche", ...).
UPDATE memberships SET
  checkin_limit = CASE
    WHEN check_ins ~* 'unbegrenzt' THEN NULL
    ELSE NULLIF(substring(check_ins from '\d+'), '')::integer
  END,
  checkin_period = CASE
    WHEN check_ins ~* 'pro Woche' THEN 'week'
    ELSE 'total'
  END;

-- Kontingent-Prüfung beim Buchen. Läuft mit den Rechten des buchenden
-- Nutzers (wie enforce_slot_capacity aus 006): die RLS-Policies erlauben
-- alles Nötige, weil nur eigene Buchungen/Zuweisungen gezählt werden.
-- Wochenfenster in Europe/Zurich, damit Kurse um Mitternacht nicht in die
-- falsche Kalenderwoche fallen.
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

CREATE TRIGGER trg_enforce_checkin_limit
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION enforce_checkin_limit();
