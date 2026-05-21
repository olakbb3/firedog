import { supabase } from '@/lib/supabaseClient';

/**
 * Returns the active FIREDOG TOTAL challenge for the current month, if any.
 * Preserves the exact filter semantics previously inlined in ProfilePage:
 *   - title = 'FIREDOG TOTAL'
 *   - start_date <= first day of current month
 *   - end_date   >= today (local en-CA date)
 *   - latest start_date, single row
 *
 * Returns the raw PostgREST-shaped result ({ data, error }) so callers can
 * preserve their existing null/error semantics.
 */
export async function getActiveChallenges() {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const monthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  ).toLocaleDateString('en-CA');

  return await supabase
    .from('challenges')
    .select('id, start_date')
    .eq('title', 'FIREDOG TOTAL')
    .lte('start_date', monthStart)
    .gte('end_date', todayStr)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/**
 * Returns the active FIREDOG TOTAL challenge for the current month using the
 * ilike/title match semantics used by useLeaderboard. Returns the raw
 * PostgREST-shaped result ({ data, error }) so callers can preserve their
 * existing null/error handling.
 */
export async function getCurrentFiredogTotalChallenge() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toLocaleDateString('en-CA');

  return await supabase
    .from('challenges')
    .select('id')
    .ilike('title', 'FIREDOG TOTAL')
    .lte('start_date', monthStart)
    .gte('end_date', todayStr)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
}

/**
 * Returns past (ended) FIREDOG TOTAL challenges, most recent first.
 * Raw PostgREST-shaped result ({ data, error }).
 */
export async function getPastFiredogTotalChallenges() {
  const today = new Date().toLocaleDateString('en-CA');
  return await supabase
    .from('challenges')
    .select('id, title, description, start_date, end_date')
    .ilike('title', 'FIREDOG TOTAL')
    .lt('end_date', today)
    .order('end_date', { ascending: false });
}

export const ChallengeService = {
  getActiveChallenges,
  getCurrentFiredogTotalChallenge,
  getPastFiredogTotalChallenges,
};

