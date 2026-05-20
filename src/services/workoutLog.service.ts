import { supabase } from '@/lib/supabaseClient';

type ServiceResult<T> =
  | { data: T; error: null }
  | { data: null; error: string };

export interface WorkoutLogPayload {
  user_id: string;
  workout_id: string | null;
  workout_section_id: string | null;
  movement_id: string | null;
  exercise_name: string | null;
  result_type: string;
  is_rx: boolean;
  completion_date: string;
  weight?: number | null;
  time?: string | null;
  rounds?: number | null;
  reps?: number | null;
  calories?: number | null;
  meters?: number | null;
  notes?: string | null;
}

export async function createWorkoutLog(
  payload: WorkoutLogPayload
): Promise<ServiceResult<{ id: string }>> {
  const { data, error } = await supabase
    .from('workout_logs')
    .insert(payload)
    .select('id')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: { id: (data as { id: string }).id }, error: null };
}

/**
 * Fetch a user's full workout_logs history for PR computation.
 * Shape must match PR_LOG_COLUMNS — do not alter.
 */
function getHistoryForUser(userId: string) {
  return supabase
    .from('workout_logs')
    .select(
      'id, workout_id, workout_section_id, movement_id, movements(id, name, category), exercise_name, result_type, weight, time, rounds, reps, calories, meters, is_rx, completion_date'
    )
    .eq('user_id', userId)
    .order('completion_date', { ascending: false });
}

/**
 * Fetch a user's workout_logs for a given set of workout ids.
 * Used for per-program completion markers.
 */
function getLogsForProgram(userId: string, wodIds: string[]) {
  return supabase
    .from('workout_logs')
    .select('workout_id')
    .eq('user_id', userId)
    .in('workout_id', wodIds);
}

export const WorkoutLogService = {
  createWorkoutLog,
  getHistoryForUser,
  getLogsForProgram,
};
