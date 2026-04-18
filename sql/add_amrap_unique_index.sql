-- Guarantee one AMRAP score per user per section per day
-- Prevents duplicate scores even under race conditions / retries
CREATE UNIQUE INDEX IF NOT EXISTS uniq_user_section_day
ON public.workout_logs (user_id, workout_section_id, (DATE(completion_date)))
WHERE result_type = 'rounds_reps';
