import { supabase } from '@/lib/supabaseClient';

/* ────────────────────────────────────────────────────────────────────────────
   Private table constants — purely DRY; no query logic is altered.
   ──────────────────────────────────────────────────────────────────────────── */
const TABLE_WORKOUTS = 'workouts';
const TABLE_SECTIONS = 'workout_sections';
const TABLE_EXERCISES = 'exercises';

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
  // ═══════════════════════════════════════════════════════════════════════════
  // === CORE WORKOUT RETRIEVAL ===
  // Primary workout-row reads used by list views and single-workout pages.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches every workout row, ordered by `workout_date` descending.
   * Preserves full `*` selection so consumers receive the complete row shape.
   * Used by: HomePage.
   */
  async getWorkouts() {
    return supabase
      .from(TABLE_WORKOUTS)
      .select('*')
      .order('workout_date', { ascending: false });
  },

  /**
   * Fetches a single workout by UUID with full `*` selection.
   * Returns `maybeSingle()` so missing rows resolve to `data: null` rather
   * than throwing. Preserves the exact fat-fetch row shape expected by
   * WorkoutPage hydration.
   * Used by: WorkoutPage.
   */
  async getWorkoutById(id: string) {
    return supabase.from(TABLE_WORKOUTS).select('*').eq('id', id).maybeSingle();
  },

  /**
   * Fetches up to `limit` workouts whose `workout_date` is on or before
   * `today`, ordered descending. Selects `id, title, workout_date` for
   * lightweight dropdown rendering.
   * Used by: LeaderboardPage (selector dropdown).
   */
  async getPastWorkouts(today: string, limit = 50) {
    return supabase
      .from(TABLE_WORKOUTS)
      .select('id, title, workout_date')
      .lte('workout_date', today)
      .order('workout_date', { ascending: false })
      .limit(limit);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // === NESTED HYDRATION (FAT FETCH) ===
  // Child-table reads that hydrate sections and exercises under a workout.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches every section belonging to a workout, ordered by `order_index`.
   * Full `*` selection preserves the nested sections array shape consumed
   * by WorkoutPage, Admin edit views, and FiredogTotalArchive.
   */
  async getSectionsByWorkout(workoutId: string) {
    return supabase
      .from(TABLE_SECTIONS)
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index');
  },

  /**
   * Fetches every exercise belonging to a workout, ordered by `order_index`.
   * Full `*` selection preserves the nested exercises array shape consumed
   * by WorkoutPage and Admin edit views.
   */
  async getExercisesByWorkout(workoutId: string) {
    return supabase
      .from(TABLE_EXERCISES)
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index');
  },

  /**
   * Fetches section name metadata for a given set of section UUIDs.
   * Selects `id, section_name, order_index` for lightweight re-hydration
   * inside the WorkoutHistoryDetailModal without pulling full rows.
   */
  async getSectionsByIds(sectionIds: string[]) {
    return supabase
      .from(TABLE_SECTIONS)
      .select('id, section_name, order_index')
      .in('id', sectionIds);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // === DEFINITIONS & MAPPING ===
  // Lightweight lookups and cross-table pairing used by PR, Leaderboard,
  // and progress features. No leaderboard or PR calculation lives here.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches a minimal `id, title` map of all workouts.
   * Used by ProgressPage and `usePersonalRecords` to resolve a log's
   * `workout_id` into a human-readable workout name.
   */
  async getWorkoutDefinitions() {
    return supabase.from(TABLE_WORKOUTS).select('id, title');
  },

  /**
   * Fetches every `workout_id` stored in the sections table (unfiltered).
   * Used by ProgressPage as a global presence map to determine whether a
   * workout has at least one section without hydrating the full row.
   */
  async getAllSectionWorkoutIds() {
    return supabase.from(TABLE_SECTIONS).select('workout_id');
  },

  /**
   * Fetches `id` and `workout_id` pairs for a set of workout UUIDs.
   * Used by LeaderboardPage for Rest-Day filtering logic.
   */
  async getSectionIdsByWorkoutIds(workoutIds: string[]) {
    return supabase
      .from(TABLE_SECTIONS)
      .select('id, workout_id')
      .in('workout_id', workoutIds);
  },

  /**
   * Fetches minimal `workout_id` rows for every section that belongs to
   * any of the supplied workout UUIDs. Used by ProgramDetailPage to build
   * a section-count map without hydrating full rows.
   */
  async getSectionWorkoutIdsForWorkouts(workoutIds: string[]) {
    return supabase
      .from(TABLE_SECTIONS)
      .select('workout_id')
      .in('workout_id', workoutIds);
  },

  /**
   * Fetches `section_id` and `workout_id` pairs from exercises for a set
   * of workout UUIDs. Used by LeaderboardPage to link exercises back to
   * their parent workout during Rest-Day filtering.
   */
  async getExerciseSectionLinksByWorkoutIds(workoutIds: string[]) {
    return supabase
      .from(TABLE_EXERCISES)
      .select('section_id, workout_id')
      .in('workout_id', workoutIds);
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // === PROGRAM ENTITLEMENTS ===
  // Reads tied to program-scoped workout access and routing fallbacks.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches workouts linked to a program for athlete-facing views.
   * Selects `id, title, workout_date` to keep payloads lean.
   * Used by: ProgramDetailPage.
   */
  async getProgramWorkouts(programId: string) {
    return supabase
      .from(TABLE_WORKOUTS)
      .select('id, title, workout_date')
      .eq('program_id', programId)
      .order('workout_date', { ascending: false });
  },

  /**
   * Fetches workouts linked to a program for admin editing views.
   * Selects `id, title, description, workout_date, date` (full editable
   * row subset) and orders with `nullsFirst: false`.
   * Used by: AdminProgramPage.
   */
  async getProgramWorkoutsForAdmin(programId: string) {
    return supabase
      .from(TABLE_WORKOUTS)
      .select('id, title, description, workout_date, date')
      .eq('program_id', programId)
      .order('workout_date', { ascending: false, nullsFirst: false });
  },

  /**
   * Fetches the workout UUID whose `workout_date` exactly matches the
   * supplied date string. Uses `limit(1)` + `maybeSingle()` for safe
   * single-row resolution.
   * Used by: ProgramsPage (today's workout routing).
   */
  async getWorkoutIdByDate(workoutDate: string) {
    return supabase
      .from(TABLE_WORKOUTS)
      .select('id')
      .eq('workout_date', workoutDate)
      .limit(1)
      .maybeSingle();
  },

  /**
   * Fetches the most recent workout UUID ordered by `workout_date` desc.
   * Serves as a fallback when no workout exists for the requested date.
   * Used by: ProgramsPage.
   */
  async getLatestWorkoutId() {
    return supabase
      .from(TABLE_WORKOUTS)
      .select('id')
      .order('workout_date', { ascending: false })
      .limit(1)
      .maybeSingle();
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // === ADMIN RETRIEVAL ===
  // Queries specific to admin dashboard and challenge management views.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Fetches every workout row for admin list views with `nullsFirst: false`
   * ordering. Preserves the full `*` selection expected by AdminDashboard.
   */
  async getAdminWorkouts() {
    return supabase
      .from(TABLE_WORKOUTS)
      .select('*')
      .order('workout_date', { ascending: false, nullsFirst: false });
  },

  /**
   * Proactive duplicate-date lookup used before creating a new workout.
   * Returns `id, title` via `maybeSingle()` for safe single-row resolution.
   * Used by: AdminDashboard.
   */
  async getWorkoutByDate(workoutDate: string) {
    return supabase
      .from(TABLE_WORKOUTS)
      .select('id, title')
      .eq('workout_date', workoutDate)
      .maybeSingle();
  },

  /**
   * Fetches `section_name` values for a workout, ordered by `order_index`.
   * Lightweight lift-name list used by the AdminDashboard challenges tab.
   */
  async getSectionNamesByWorkout(workoutId: string) {
    return supabase
      .from(TABLE_SECTIONS)
      .select('section_name')
      .eq('workout_id', workoutId)
      .order('order_index');
  },

  /**
   * Fetches `id` and `section_name` for a workout, ordered by `order_index`.
   * Used by the AdminDashboard challenges tab when editing challenge lifts.
   */
  async getSectionIdNamesByWorkout(workoutId: string) {
    return supabase
      .from(TABLE_SECTIONS)
      .select('id, section_name')
      .eq('workout_id', workoutId)
      .order('order_index');
  },
};
