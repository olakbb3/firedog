import { supabase } from '@/lib/supabaseClient';

type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface UserProfile {
  id: string;
  role: string | null;
  accepted_terms: boolean | null;
  accepted_terms_at: string | null;
  full_name: string | null;
  avatar_url: string | null;
  preferred_unit: string | null;
  weight_lbs: number | null;
  height_inches: number | null;
  gym_affiliation: string | null;
  fd_affiliation: string | null;
  fd_career_volunteer: string | null;
  fd_rank: string | null;
  tier: string | null;
}

export async function getProfile(
  userId: string
): Promise<ServiceResult<UserProfile>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserProfile, error: null };
}

export async function updateProfile(
  userId: string,
  updates: Partial<UserProfile>
): Promise<ServiceResult<UserProfile>> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data as UserProfile, error: null };
}

export async function getProfilePoints(
  userId: string
): Promise<ServiceResult<number | null>> {
  const { data, error } = await supabase
    .from('profiles')
    .select('points')
    .eq('id', userId)
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data?.points ?? null) as number | null, error: null };
}

/**
 * Hydrates the profile fields used by ProfilePage with a defensive fallback:
 * if the `preferred_unit` column is unavailable, retry without it.
 * Returns the raw PostgREST-shaped result ({ data, error }) so callers can
 * preserve their existing error/null semantics.
 */
export async function getProfileWithUnitFallback(userId: string) {
  const baseCols =
    'full_name, points, completed_workouts, avatar_url, weight_lbs, height_inches, gym_affiliation, fd_affiliation, fd_career_volunteer, fd_rank, rank';

  let profileRes = await supabase
    .from('profiles')
    .select(`${baseCols}, preferred_unit`)
    .eq('id', userId)
    .maybeSingle();

  if (profileRes.error && /preferred_unit/i.test(profileRes.error.message || '')) {
    profileRes = await supabase
      .from('profiles')
      .select(baseCols)
      .eq('id', userId)
      .maybeSingle();
  }

  return profileRes;
}
