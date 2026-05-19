import { supabase } from '@/lib/supabaseClient';

type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export async function getWodLeaderboard(
  workoutId: string
): Promise<ServiceResult<unknown[]>> {
  const { data, error } = await supabase.rpc('get_wod_leaderboard', {
    p_workout_id: workoutId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data ?? []) as unknown[], error: null };
}

export async function getGlobalLeaderboard(
  movementId: string
): Promise<ServiceResult<unknown[]>> {
  const { data, error } = await supabase.rpc('get_global_leaderboard', {
    p_movement_id: movementId,
  });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: (data ?? []) as unknown[], error: null };
}

/**
 * Transport-only wrapper for the `get_leaderboard_logs` RPC.
 * Returns the raw PostgREST result ({ data, error }) so callers can preserve
 * existing destructuring and post-processing semantics.
 */
export async function getLeaderboardLogs(params: Record<string, any>) {
  return await supabase.rpc('get_leaderboard_logs', params);
}

/**
 * Transport-only wrapper for the `get_today_log_counts` RPC.
 * Returns the raw PostgREST result ({ data, error }).
 */
export async function getTodayLogCounts(params: Record<string, any>) {
  return await supabase.rpc('get_today_log_counts', params);
}

export const LeaderboardService = {
  getWodLeaderboard,
  getGlobalLeaderboard,
  getLeaderboardLogs,
  getTodayLogCounts,
};
