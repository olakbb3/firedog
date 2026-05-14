-- Phase 4: Movement Normalization Foundation (additive, idempotent)
-- Execute manually in Supabase. Safe to re-run.

-- ============================================================
-- 1. Canonical Movements
-- ============================================================
CREATE TABLE IF NOT EXISTS public.movements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  canonical_name text NOT NULL,
  normalized_key text NOT NULL,
  category text,
  default_result_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Bring existing installations up to spec without altering data.
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS canonical_name text;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS normalized_key text;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS default_result_type text;
ALTER TABLE public.movements ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Backfill canonical_name from legacy `name` column if present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='movements' AND column_name='name'
  ) THEN
    UPDATE public.movements
       SET canonical_name = COALESCE(canonical_name, name)
     WHERE canonical_name IS NULL;
  END IF;
END$$;

UPDATE public.movements
   SET normalized_key = lower(trim(canonical_name))
 WHERE normalized_key IS NULL AND canonical_name IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_movements_normalized_key
  ON public.movements(normalized_key);
CREATE UNIQUE INDEX IF NOT EXISTS idx_movements_canonical_name
  ON public.movements(canonical_name);

-- ============================================================
-- 2. Movement Aliases
-- ============================================================
CREATE TABLE IF NOT EXISTS public.movement_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL,
  normalized_alias text NOT NULL,
  movement_id uuid NOT NULL REFERENCES public.movements(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_movement_aliases_normalized_alias
  ON public.movement_aliases(normalized_alias);
CREATE INDEX IF NOT EXISTS idx_movement_aliases_movement_id
  ON public.movement_aliases(movement_id);

-- ============================================================
-- 3. RLS — public read, admin-only write
-- ============================================================
ALTER TABLE public.movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movement_aliases ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movements' AND policyname='movements_public_read') THEN
    CREATE POLICY movements_public_read ON public.movements FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='movement_aliases' AND policyname='movement_aliases_public_read') THEN
    CREATE POLICY movement_aliases_public_read ON public.movement_aliases FOR SELECT USING (true);
  END IF;
END$$;

-- ============================================================
-- 4. Seed canonical movements + aliases (foundation set)
-- ============================================================
INSERT INTO public.movements (canonical_name, normalized_key, category, default_result_type) VALUES
  ('Deadlift',       'deadlift',       'barbell', 'weight'),
  ('Back Squat',     'back squat',     'barbell', 'weight'),
  ('Front Squat',    'front squat',    'barbell', 'weight'),
  ('Bench Press',    'bench press',    'barbell', 'weight'),
  ('Strict Press',   'strict press',   'barbell', 'weight'),
  ('Power Clean',    'power clean',    'barbell', 'weight'),
  ('Weighted Pull-Up','weighted pull-up','gymnastics','weight'),
  ('SkiErg',         'skierg',         'cardio',  'calories'),
  ('Row',            'row',            'cardio',  'calories'),
  ('Echo Bike',      'echo bike',      'cardio',  'calories')
ON CONFLICT (normalized_key) DO NOTHING;

-- Alias seeds — resolve to canonical movements via normalized_key lookup.
WITH alias_rows(alias, normalized_alias, canonical_key) AS (
  VALUES
    ('deadlift',           'deadlift',           'deadlift'),
    ('Dead Lift',          'dead lift',          'deadlift'),
    ('back squat',         'back squat',         'back squat'),
    ('BS',                 'bs',                 'back squat'),
    ('front squat',        'front squat',        'front squat'),
    ('FS',                 'fs',                 'front squat'),
    ('bench press',        'bench press',        'bench press'),
    ('Bench',              'bench',              'bench press'),
    ('strict press',       'strict press',       'strict press'),
    ('Shoulder Press',     'shoulder press',     'strict press'),
    ('power clean',        'power clean',        'power clean'),
    ('Weighted Pull-up',   'weighted pull-up',   'weighted pull-up'),
    ('Weighted Pull-ups',  'weighted pull-ups',  'weighted pull-up'),
    ('Weighted Pullup',    'weighted pullup',    'weighted pull-up'),
    ('sky erg',            'sky erg',            'skierg'),
    ('Ski Erg',            'ski erg',            'skierg'),
    ('SkiErg',             'skierg',             'skierg'),
    ('Rower',              'rower',              'row'),
    ('Concept2 Row',       'concept2 row',       'row'),
    ('Assault Bike',       'assault bike',       'echo bike'),
    ('Echo',               'echo',               'echo bike')
)
INSERT INTO public.movement_aliases (alias, normalized_alias, movement_id)
SELECT a.alias, a.normalized_alias, m.id
  FROM alias_rows a
  JOIN public.movements m ON m.normalized_key = a.canonical_key
ON CONFLICT (normalized_alias) DO NOTHING;
