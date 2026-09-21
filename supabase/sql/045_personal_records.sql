-- Kraftwerte / PRs pro Mitglied - eine Zeile je Übung, analog zu den
-- "Benchmark Stats" auf crossfit.com. Werte immer in Kilogramm.
--
-- lift_key referenziert bewusst keine Stammdaten-Tabelle: der Katalog der
-- Übungen steht als Konstante im Code (src/lib/lifts.ts). Er ändert sich
-- praktisch nie und braucht keine Admin-Pflege; eine Übung zu ergänzen ist
-- eine Code-Änderung, alte Zeilen bleiben unberührt liegen.
--
-- Die Werte gehören dem Mitglied und sind privat: keine Admin-Policy, auch
-- Kursleiter:innen sehen sie nicht.

CREATE TABLE personal_records (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  lift_key TEXT NOT NULL,
  -- Maximal 999.5 kg, halbe Kilo genügen als Auflösung (Hantelscheiben).
  value_kg NUMERIC(5,1) NOT NULL CHECK (value_kg > 0 AND value_kg <= 999.5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, lift_key)
);

ALTER TABLE personal_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own personal records"
ON personal_records FOR SELECT
USING (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can insert own personal records"
ON personal_records FOR INSERT
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can update own personal records"
ON personal_records FOR UPDATE
USING (user_id = (SELECT auth.uid()))
WITH CHECK (user_id = (SELECT auth.uid()));

CREATE POLICY "Users can delete own personal records"
ON personal_records FOR DELETE
USING (user_id = (SELECT auth.uid()));
