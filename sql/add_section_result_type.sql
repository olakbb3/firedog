-- Add result_type column to workout_sections (ADDITIVE ONLY)
ALTER TABLE workout_sections ADD COLUMN IF NOT EXISTS result_type text
  CHECK (result_type IN ('completed', 'time', 'rounds_reps', 'calories', 'meters', 'weight'))
  DEFAULT 'completed';
