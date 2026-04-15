-- Add exercise_name column to workout_logs for per-exercise tracking
ALTER TABLE workout_logs ADD COLUMN IF NOT EXISTS exercise_name text;

-- Index for efficient lookups
CREATE INDEX IF NOT EXISTS idx_workout_logs_exercise_name ON workout_logs(exercise_name);
