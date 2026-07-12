ALTER TABLE appointment_slots
  ADD COLUMN course_type_id BIGINT NOT NULL REFERENCES course_types(id),
  ADD COLUMN level_id BIGINT NOT NULL REFERENCES levels(id);
