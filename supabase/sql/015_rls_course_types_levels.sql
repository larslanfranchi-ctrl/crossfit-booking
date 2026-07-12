ALTER TABLE course_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE levels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view course types"
ON course_types FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert course types"
ON course_types FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update course types"
ON course_types FOR UPDATE
USING (is_admin());

CREATE POLICY "Authenticated users can view levels"
ON levels FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can insert levels"
ON levels FOR INSERT
WITH CHECK (is_admin());

CREATE POLICY "Admins can update levels"
ON levels FOR UPDATE
USING (is_admin());
