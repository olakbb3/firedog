-- Add unit preference to profiles. Safe to re-run.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS preferred_unit text DEFAULT 'imperial';
