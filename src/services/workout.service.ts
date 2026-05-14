import { supabase } from '@/lib/supabaseClient';

/**
 * WorkoutService
 *
 * Centralized access layer for workout-related Supabase queries.
 * All workout / workout_sections / workout_exercises queries should
 * live here. Pages, hooks, and components must consume this service
 * instead of querying Supabase directly.
 *
 * Phase 2.A: HomePage migration only. Additional methods will be
 * added in Phase 2.B as more pages are migrated.
 */
export const WorkoutService = {
  /**
   * Fetch all workouts ordered by workout_date desc.
   * Mirrors the inline query previously used by HomePage.
   *
   * Original inline query:
   *   supabase.from('workouts').select('*').order('workout_date', { ascending: false })
   */
  async getWorkouts() {
    return supabase
      .from('workouts')
      .select('*')
      .order('workout_date', { ascending: false });
  },
};
