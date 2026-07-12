ALTER TABLE appointment_slots
  ADD COLUMN description TEXT,
  ADD COLUMN instructor_id UUID REFERENCES profiles(id);
