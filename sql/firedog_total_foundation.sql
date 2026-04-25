-- Firedog Total foundation cleanup. Safe to re-run.
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS is_hidden boolean DEFAULT false;

UPDATE public.challenges
SET is_hidden = true
WHERE title <> 'FIREDOG TOTAL';

UPDATE public.challenges
SET is_hidden = false
WHERE title = 'FIREDOG TOTAL';
