import { supabase } from '@/lib/supabaseClient';

/**
 * WorkoutService
 *
 * Centralized access layer for workout-definition Supabase queries:
 *   - workouts
 *   - workout_sections
 *   - exercises (workout_exercises in spec; physical table is `exercises`)
 *
 * Pages, hooks, and components MUST consume this service instead of
 * querying these tables directly. All write operations (insert/update/delete)
 * for admin workout authoring remain inline in the admin pages — this
 * service owns READ / hydration responsibilities only.
 *
 * Each method preserves the EXACT inline query (select, filters, ordering,
 * nullsFirst, limit, maybeSingle) of its original call site so consumers
 * see identical payload shapes.
 */
export const WorkoutService = {
  // ─────────────────────────────────────────────────────────────────────────
  // workouts — list / definition retrieval
  // ─────────────────────────────────────────────────────────────────────────

  /** HomePage — all workouts ordered by date desc. */
  async getWorkouts() {
    return supabase
      .from('workouts')
      .select('*')
      .order('workout_date', { ascending: false });
  },

  /** AdminDashboard — admin workouts list (nullsFirst:false). */
  async getAdminWorkouts() {
    return supabase
      .from('workouts')
      .select('*')
      .order('workout_date', { ascending: false, nullsFirst: false });
  },

  /** AdminProgramPage — workouts for one program (full editable rows). */
  async getProgramWorkoutsForAdmin(programId: string) {
    return supabase
      .from('workouts')
      .select('id, title, description, workout_date, date')
      .eq('program_id', programId)
      .order('workout_date', { ascending: false, nullsFirst: false });
  },

  /** ProgramDetailPage — workouts for one program (athlete view). */
  async getProgramWorkouts(programId: string) {
    return supabase
      .from('workouts')
      .select('id, title, workout_date')
      .eq('program_id', programId)
      .order('workout_date', { ascending: false });
  },

  /** WorkoutPage — single workout fat fetch (just the row). */
  async getWorkoutById(id: string) {
    return supabase.from('workouts').select('*').eq('id', id).maybeSingle();
  },

  /**
   * ProgressPage / usePersonalRecords — id+title map for log → workout name
   * resolution. Does NOT include leaderboard/PR transformation logic.
   */
  async getWorkoutDefinitions() {
    return supabase.from('workouts').select('id, title');
  },

  /** LeaderboardPage — past workouts (lte today) for selector dropdown. */
  async getPastWorkouts(today: string, limit = 50) {
    return supabase
      .from('workouts')
      .select('id, title, workout_date')
      .lte('workout_date', today)
      .order('workout_date', { ascending: false })
      .limit(limit);
  },

  /** AdminDashboard — duplicate-date proactive lookup. */
  async getWorkoutByDate(workoutDate: string) {
    return supabase
      .from('workouts')
      .select('id, title')
      .eq('workout_date', workoutDate)
      .maybeSingle();
  },

  /** ProgramsPage — today's workout id (single). */
  async getWorkoutIdByDate(workoutDate: string) {
    return supabase
      .from('workouts')
      .select('id')
      .eq('workout_date', workoutDate)
      .limit(1)
      .maybeSingle();
  },

  /** ProgramsPage — most recent workout id fallback. */
  async getLatestWorkoutId() {
    return supabase
      .from('workouts')
      .select('id')
      .order('workout_date', { ascending: false })
      .limit(1)
      .maybeSingle();
  },

  // ─────────────────────────────────────────────────────────────────────────
  // workout_sections — hydration variants (selects differ by call site)
  // ─────────────────────────────────────────────────────────────────────────

  /** WorkoutPage / Admin edit / FiredogTotalArchive — full sections by workout. */
  async getSectionsByWorkout(workoutId: string) {
    return supabase
      .from('workout_sections')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index');
  },

  /** ProgramDetailPage — minimal `workout_id` rows for section-count map. */
  async getSectionWorkoutIdsForWorkouts(workoutIds: string[]) {
    return supabase
      .from('workout_sections')
      .select('workout_id')
      .in('workout_id', workoutIds);
  },

  /** ProgressPage — global presence map (`workout_id` only, unfiltered). */
  async getAllSectionWorkoutIds() {
    return supabase.from('workout_sections').select('workout_id');
  },

  /** LeaderboardPage — section ids + workout ids for Rest-Day filtering. */
  async getSectionIdsByWorkoutIds(workoutIds: string[]) {
    return supabase
      .from('workout_sections')
      .select('id, workout_id')
      .in('workout_id', workoutIds);
  },

  /** WorkoutHistoryDetailModal — hydrate section names by section id. */
  async getSectionsByIds(sectionIds: string[]) {
    return supabase
      .from('workout_sections')
      .select('id, section_name, order_index')
      .in('id', sectionIds);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // exercises — hydration
  // ─────────────────────────────────────────────────────────────────────────

  /** WorkoutPage / Admin edit — full exercises by workout. */
  async getExercisesByWorkout(workoutId: string) {
    return supabase
      .from('exercises')
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index');
  },

  /** LeaderboardPage — section/workout pairing for Rest-Day filtering. */
  async getExerciseSectionLinksByWorkoutIds(workoutIds: string[]) {
    return supabase
      .from('exercises')
      .select('section_id, workout_id')
      .in('workout_id', workoutIds);
  },
};
