ALTER TABLE appointment_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view slots"
ON appointment_slots FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert slots"
ON appointment_slots FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update slots"
ON appointment_slots FOR UPDATE
USING (is_admin());

CREATE POLICY "Admins can delete slots"
ON appointment_slots FOR DELETE
USING (is_admin());
