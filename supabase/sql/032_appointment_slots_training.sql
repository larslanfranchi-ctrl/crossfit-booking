ALTER TABLE appointment_slots ADD COLUMN training_id BIGINT REFERENCES trainings(id);
