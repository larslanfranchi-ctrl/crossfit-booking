-- Serverseitig hart erzwungen (nicht nur UI-verhindert), analog zum
-- bestehenden enforce_slot_capacity-Trigger: verhindert, dass der letzte
-- verbleibende Admin (durch sich selbst oder einen anderen Admin) auf die
-- Rolle 'user' herabgestuft wird, da danach niemand mehr Admin-Rechte
-- vergeben könnte.
CREATE OR REPLACE FUNCTION prevent_last_admin_demotion()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  remaining_admins integer;
BEGIN
  IF OLD.role = 'admin' AND NEW.role <> 'admin' THEN
    SELECT COUNT(*) INTO remaining_admins
    FROM profiles
    WHERE role = 'admin' AND id <> OLD.id;

    IF remaining_admins = 0 THEN
      RAISE EXCEPTION 'Der letzte Admin kann nicht herabgestuft werden.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_prevent_last_admin_demotion
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION prevent_last_admin_demotion();
