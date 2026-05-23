import { supabase } from '@/lib/supabaseClient';

/**
 * Returns the active FIREDOG TOTAL challenge for the current month, if any.
 */
export async function getActiveChallenges() {
  const today = new Date();
  const todayStr = today.toLocaleDateString('en-CA');
  const monthStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    1
  ).toLocaleDateString('en-CA');

  const { data, error } = await supabase
    .from('challenges')
    .select('id, start_date')
    .eq('title', 'FIREDOG TOTAL')
    .lte('start_date', monthStart)
    .gte('end_date', todayStr)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

export async function getCurrentFiredogTotalChallenge() {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toLocaleDateString('en-CA');
  const todayStr = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toLocaleDateString('en-CA');

  const { data, error } = await supabase
    .from('challenges')
    .select('id')
    .ilike('title', 'FIREDOG TOTAL')
    .lte('start_date', monthStart)
    .gte('end_date', todayStr)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  return { data, error };
}

export async function getPastFiredogTotalChallenges() {
  const today = new Date().toLocaleDateString('en-CA');
  const { data, error } = await supabase
    .from('challenges')
    .select('id, title, description, start_date, end_date')
    .ilike('title', 'FIREDOG TOTAL')
    .lt('end_date', today)
    .order('end_date', { ascending: false });
  return { data, error };
}

export const ChallengeService = {
  getActiveChallenges,
  getCurrentFiredogTotalChallenge,
  getPastFiredogTotalChallenges,
};
