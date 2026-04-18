-- Add optional time cap (minutes) to workout sections
-- Run once in Supabase SQL editor.
ALTER TABLE public.workout_sections
ADD COLUMN IF NOT EXISTS time_cap_minutes integer;
