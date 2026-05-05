/**
 * PURE FUNCTION — Workout Log Payload Factory
 *
 * This function MUST:
 * - contain no side effects
 * - not mutate external state
 * - not infer business logic from UI
 */

import type { WorkoutLogPayload } from './workoutLog.service';

export function buildWorkoutLogPayload(params: {
  userId: string;
  workoutId?: string | null;
  sectionId?: string | null;
  movementId?: string | null;
  exerciseName?: string | null;
  resultType: string;
  isRx?: boolean;
  completionDate: string | Date;
  weight?: number | null;
  time?: string | null;
  rounds?: number | null;
  reps?: number | null;
  calories?: number | null;
  meters?: number | null;
  notes?: string | null;
}): WorkoutLogPayload {
  return {
    user_id: params.userId,
    workout_id: params.workoutId ?? null,
    workout_section_id: params.sectionId ?? null,
    movement_id: params.movementId ?? null,
    exercise_name: params.exerciseName ?? null,
    result_type: params.resultType as WorkoutLogPayload['result_type'],

    /**
     * DOMAIN RULE — RX TRAINING STATE
     *
     * RX is a training state, not a UI flow state.
     *
     * RX may come from:
     *   - explicit user selection
     *   - computed performance match
     *   - explicit marking
     *
     * RX must NEVER be derived from:
     *   - component type
     *   - flow type (section, freestyle, per-exercise)
     *   - UI defaults
     *
     * If not explicitly provided → default false
     */
    is_rx: params.isRx ?? false,

    completion_date:
      typeof params.completionDate === 'string'
        ? new Date(params.completionDate).toISOString()
        : params.completionDate.toISOString(),

    weight: params.weight ?? null,
    time: params.time ?? null,
    rounds: params.rounds ?? null,
    reps: params.reps ?? null,
    calories: params.calories ?? null,
    meters: params.meters ?? null,
    notes: params.notes ?? null,
  };
}
