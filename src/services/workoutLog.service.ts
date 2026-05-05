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
