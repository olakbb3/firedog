-- Add athlete details to profiles table
-- Safe to re-run; uses IF NOT EXISTS

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weight_lbs integer,
  ADD COLUMN IF NOT EXISTS height_inches integer,
  ADD COLUMN IF NOT EXISTS gym_affiliation text,
  ADD COLUMN IF NOT EXISTS fd_affiliation text,
  ADD COLUMN IF NOT EXISTS fd_career_volunteer text,
  ADD COLUMN IF NOT EXISTS fd_rank text;
