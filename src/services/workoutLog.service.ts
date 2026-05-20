import { supabase } from '@/lib/supabaseClient';
import { PR_LOG_COLUMNS } from '@/utils/personalRecords';

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

/**
 * Fetch prior logs scoped to PR_LOG_COLUMNS for PR evaluation.
 * Centralized so all write surfaces share the same scan shape.
 */
async function getPriorLogsForPR(userId: string) {
  return supabase
    .from('workout_logs')
    .select(PR_LOG_COLUMNS)
    .eq('user_id', userId);
}

/**
 * Idempotent upsert for workout logs.
 *
 * Deduplication rule (per CURRENT calendar day, scoped to user):
 *   match same workout_section_id (or null), same movement_id (or null),
 *   and same exercise_name (or null).
 *
 * If a row matches → UPDATE that row.
 * Otherwise → INSERT a new row (createWorkoutLog behavior).
 */
async function upsertLog(
  payload: WorkoutLogPayload
): Promise<ServiceResult<{ id: string }>> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  let query = supabase
    .from('workout_logs')
    .select('id')
    .eq('user_id', payload.user_id)
    .gte('completion_date', startOfDay.toISOString())
    .lte('completion_date', endOfDay.toISOString());

  query = payload.workout_section_id
    ? query.eq('workout_section_id', payload.workout_section_id)
    : query.is('workout_section_id', null);

  query = payload.movement_id
    ? query.eq('movement_id', payload.movement_id)
    : query.is('movement_id', null);

  query = payload.exercise_name
    ? query.eq('exercise_name', payload.exercise_name)
    : query.is('exercise_name', null);

  const { data: existing, error: lookupErr } = await query.maybeSingle();
  if (lookupErr) {
    return { data: null, error: lookupErr.message };
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('workout_logs')
      .update(payload)
      .eq('id', existing.id)
      .select('id')
      .single();
    if (error) return { data: null, error: error.message };
    return { data: { id: (data as { id: string }).id }, error: null };
  }

  const { data, error } = await supabase
    .from('workout_logs')
    .insert(payload)
    .select('id')
    .single();
  if (error) return { data: null, error: error.message };
  return { data: { id: (data as { id: string }).id }, error: null };
}

export const WorkoutLogService = {
  createWorkoutLog,
  getHistoryForUser,
  getLogsForProgram,
  getPriorLogsForPR,
  upsertLog,
};
