-- Per-Section Logging: Add columns to workout_logs (ADDITIVE ONLY)

-- New columns
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS workout_day_id uuid REFERENCES workout_days(id);
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS workout_section_id uuid REFERENCES workout_sections(id);
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS result_type text CHECK (result_type IN ('completed', 'time', 'rounds_reps', 'calories', 'meters', 'weight'));
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS time_logged text;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS rounds integer CHECK (rounds >= 0);
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS calories integer CHECK (calories >= 0);
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS meters integer CHECK (meters >= 0);
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS is_rx boolean;
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Ensure weight column uses numeric type (may already exist as integer; add if not exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workout_logs' AND column_name = 'weight' AND table_schema = 'public'
  ) THEN
    ALTER TABLE workout_logs ADD COLUMN weight numeric CHECK (weight >= 0);
  END IF;
END$$;

-- Add check constraints to existing columns if they don't exist
-- reps already exists; add >= 0 check
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'workout_logs_reps_nonneg'
  ) THEN
    ALTER TABLE workout_logs ADD CONSTRAINT workout_logs_reps_nonneg CHECK (reps >= 0);
  END IF;
END$$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_day_id ON workout_logs(workout_day_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_workout_section_id ON workout_logs(workout_section_id);
CREATE INDEX IF NOT EXISTS idx_workout_logs_user_id ON workout_logs(user_id);
