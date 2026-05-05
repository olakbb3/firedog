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
