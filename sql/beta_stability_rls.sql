-- Beta Stability RLS hardening
-- Enforces backend admin writes and protected purchase/image access.

-- Role foundation: keep admin authorization server-side in a separate table.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'app_role') THEN
    CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'coach', 'athlete', 'user');
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- One-time bootstrap from the current profile role source so existing admins keep access.
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role
FROM public.profiles
WHERE role = 'admin'
ON CONFLICT (user_id, role) DO NOTHING;

DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Admin-managed content tables.
ALTER TABLE public.workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read workouts" ON public.workouts;
DROP POLICY IF EXISTS "Admins can insert workouts" ON public.workouts;
DROP POLICY IF EXISTS "Admins can update workouts" ON public.workouts;
DROP POLICY IF EXISTS "Admins can delete workouts" ON public.workouts;
CREATE POLICY "Authenticated users can read workouts" ON public.workouts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert workouts" ON public.workouts FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update workouts" ON public.workouts FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete workouts" ON public.workouts FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read workout sections" ON public.workout_sections;
DROP POLICY IF EXISTS "Admins can insert workout sections" ON public.workout_sections;
DROP POLICY IF EXISTS "Admins can update workout sections" ON public.workout_sections;
DROP POLICY IF EXISTS "Admins can delete workout sections" ON public.workout_sections;
CREATE POLICY "Authenticated users can read workout sections" ON public.workout_sections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert workout sections" ON public.workout_sections FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update workout sections" ON public.workout_sections FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete workout sections" ON public.workout_sections FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can insert exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can update exercises" ON public.exercises;
DROP POLICY IF EXISTS "Admins can delete exercises" ON public.exercises;
CREATE POLICY "Authenticated users can read exercises" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update exercises" ON public.exercises FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete exercises" ON public.exercises FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Authenticated users can read challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admins can insert challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admins can update challenges" ON public.challenges;
DROP POLICY IF EXISTS "Admins can delete challenges" ON public.challenges;
CREATE POLICY "Authenticated users can read challenges" ON public.challenges FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert challenges" ON public.challenges FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update challenges" ON public.challenges FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete challenges" ON public.challenges FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Workout logs: private by default. Users can manage only their own raw log rows;
-- leaderboard UIs use the limited SECURITY DEFINER RPCs below instead of broad table reads.
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Admins can view all logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can insert own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.workout_logs;
DROP POLICY IF EXISTS "Users can delete own logs" ON public.workout_logs;

CREATE POLICY "Users can view own logs" ON public.workout_logs
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all logs" ON public.workout_logs
FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own logs" ON public.workout_logs
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own logs" ON public.workout_logs
FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own logs" ON public.workout_logs
FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_leaderboard_logs(
  _workout_id uuid,
  _section_id uuid DEFAULT NULL,
  _from timestamptz DEFAULT NULL,
  _to timestamptz DEFAULT NULL,
  _weight_only boolean DEFAULT false
)
RETURNS TABLE (
  user_id uuid,
  user_name text,
  gym_affiliation text,
  fd_affiliation text,
  fd_career_volunteer text,
  workout_section_id uuid,
  result_type text,
  time text,
  rounds integer,
  reps integer,
  calories integer,
  meters integer,
  weight numeric,
  is_rx boolean,
  completion_date timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    wl.user_id,
    COALESCE(p.full_name, 'Athlete') AS user_name,
    p.gym_affiliation,
    p.fd_affiliation,
    p.fd_career_volunteer,
    wl.workout_section_id,
    wl.result_type,
    wl.time,
    wl.rounds,
    wl.reps,
    wl.calories,
    wl.meters,
    wl.weight,
    wl.is_rx,
    wl.completion_date
  FROM public.workout_logs wl
  LEFT JOIN public.profiles p ON p.id = wl.user_id
  WHERE auth.uid() IS NOT NULL
    AND wl.workout_id = _workout_id
    AND (_section_id IS NULL OR wl.workout_section_id = _section_id)
    AND (_from IS NULL OR wl.completion_date >= _from)
    AND (_to IS NULL OR wl.completion_date < _to)
    AND (_weight_only = false OR wl.weight IS NOT NULL);
$$;

CREATE OR REPLACE FUNCTION public.get_today_log_counts(
  _from timestamptz,
  _to timestamptz
)
RETURNS TABLE (
  user_id uuid,
  log_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT wl.user_id, COUNT(*)::bigint AS log_count
  FROM public.workout_logs wl
  WHERE auth.uid() IS NOT NULL
    AND wl.completion_date >= _from
    AND wl.completion_date < _to
  GROUP BY wl.user_id;
$$;

REVOKE ALL ON FUNCTION public.get_leaderboard_logs(uuid, uuid, timestamptz, timestamptz, boolean) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_today_log_counts(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_logs(uuid, uuid, timestamptz, timestamptz, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_today_log_counts(timestamptz, timestamptz) TO authenticated;

-- Program image storage: authenticated read, admin-only writes.
UPDATE storage.buckets
SET public = false
WHERE id = 'program-images';

DROP POLICY IF EXISTS "Anyone can view program images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can view program images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload program images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update program images" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete program images" ON storage.objects;

CREATE POLICY "Authenticated users can view program images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'program-images');

CREATE POLICY "Admins can upload program images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'program-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update program images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'program-images' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'program-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete program images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'program-images' AND public.has_role(auth.uid(), 'admin'));

-- Pending purchases: users may read their own email-matched rows; only admins/service role can write.
ALTER TABLE public.pending_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own pending purchases" ON public.pending_purchases;
DROP POLICY IF EXISTS "Admins can insert pending purchases" ON public.pending_purchases;
DROP POLICY IF EXISTS "Admins can update pending purchases" ON public.pending_purchases;
DROP POLICY IF EXISTS "Admins can delete pending purchases" ON public.pending_purchases;

CREATE POLICY "Users can view own pending purchases"
ON public.pending_purchases
FOR SELECT
TO authenticated
USING (lower(email) = lower(auth.jwt() ->> 'email') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pending purchases"
ON public.pending_purchases
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pending purchases"
ON public.pending_purchases
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending purchases"
ON public.pending_purchases
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
