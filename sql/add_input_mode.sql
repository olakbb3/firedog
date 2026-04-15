-- Add input_mode column to workout_sections
ALTER TABLE workout_sections ADD COLUMN IF NOT EXISTS input_mode text 
  CHECK (input_mode IN ('single', 'per_exercise')) 
  DEFAULT 'single';
