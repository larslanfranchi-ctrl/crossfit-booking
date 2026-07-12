-- "SELECT ... FOR UPDATE" sperrt die Zeile in appointment_slots für die Dauer
-- der Transaktion. Dadurch werden gleichzeitige Buchungsversuche für denselben
-- Slot serialisiert (die zweite Transaktion wartet, bis die erste committet
-- oder zurückgerollt wird, und zählt danach die aktuellen Buchungen neu) -
-- ohne die Sperre könnten zwei parallele Buchungen die Kapazität überschreiten.
CREATE OR REPLACE FUNCTION enforce_slot_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  current_count integer;
  slot_capacity integer;
BEGIN
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

CREATE TRIGGER trg_enforce_slot_capacity
BEFORE INSERT ON bookings
FOR EACH ROW EXECUTE FUNCTION enforce_slot_capacity();
