ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bookings, admins view all"
ON bookings FOR SELECT
USING (user_id = auth.uid() OR is_admin());

CREATE POLICY "Users can create own bookings"
ON bookings FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can cancel own bookings, admins cancel any"
ON bookings FOR DELETE
USING (user_id = auth.uid() OR is_admin());
