ALTER TABLE trainings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view trainings"
ON trainings FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert trainings"
ON trainings FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update trainings"
ON trainings FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete trainings"
ON trainings FOR DELETE
USING (is_admin());
