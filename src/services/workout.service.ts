import { supabase } from '@/lib/supabaseClient';

const TABLE_WORKOUTS = 'workouts';
const TABLE_SECTIONS = 'workout_sections';
const TABLE_EXERCISES = 'exercises';

/**
 * WorkoutService — centralized read access for workout definition tables.
 * All methods return { data, error }.
 */
export const WorkoutService = {
  async getWorkouts() {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('*')
      .order('workout_date', { ascending: false });
    return { data, error };
  },

  async getWorkoutById(id: string) {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('*')
      .eq('id', id)
      .maybeSingle();
    return { data, error };
  },

  async getPastWorkouts(today: string, limit = 50) {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('id, title, workout_date')
      .lte('workout_date', today)
      .order('workout_date', { ascending: false })
      .limit(limit);
    return { data, error };
  },

  async getSectionsByWorkout(workoutId: string) {
    const { data, error } = await supabase
      .from(TABLE_SECTIONS)
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index');
    return { data, error };
  },

  async getExercisesByWorkout(workoutId: string) {
    const { data, error } = await supabase
      .from(TABLE_EXERCISES)
      .select('*')
      .eq('workout_id', workoutId)
      .order('order_index');
    return { data, error };
  },

  async getSectionsByIds(sectionIds: string[]) {
    const { data, error } = await supabase
      .from(TABLE_SECTIONS)
      .select('id, section_name, order_index')
      .in('id', sectionIds);
    return { data, error };
  },

  async getWorkoutDefinitions() {
    const { data, error } = await supabase.from(TABLE_WORKOUTS).select('id, title');
    return { data, error };
  },

  async getAllSectionWorkoutIds() {
    const { data, error } = await supabase.from(TABLE_SECTIONS).select('workout_id');
    return { data, error };
  },

  async getSectionIdsByWorkoutIds(workoutIds: string[]) {
    const { data, error } = await supabase
      .from(TABLE_SECTIONS)
      .select('id, workout_id')
      .in('workout_id', workoutIds);
    return { data, error };
  },

  async getSectionWorkoutIdsForWorkouts(workoutIds: string[]) {
    const { data, error } = await supabase
      .from(TABLE_SECTIONS)
      .select('workout_id')
      .in('workout_id', workoutIds);
    return { data, error };
  },

  async getExerciseSectionLinksByWorkoutIds(workoutIds: string[]) {
    const { data, error } = await supabase
      .from(TABLE_EXERCISES)
      .select('section_id, workout_id')
      .in('workout_id', workoutIds);
    return { data, error };
  },

  async getProgramWorkouts(programId: string) {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('id, title, workout_date')
      .eq('program_id', programId)
      .order('workout_date', { ascending: false });
    return { data, error };
  },

  async getProgramWorkoutsForAdmin(programId: string) {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('id, title, description, workout_date, date')
      .eq('program_id', programId)
      .order('workout_date', { ascending: false, nullsFirst: false });
    return { data, error };
  },

  async getWorkoutIdByDate(workoutDate: string) {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('id')
      .eq('workout_date', workoutDate)
      .limit(1)
      .maybeSingle();
    return { data, error };
  },

  async getLatestWorkoutId() {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('id')
      .order('workout_date', { ascending: false })
      .limit(1)
      .maybeSingle();
    return { data, error };
  },

  async getAdminWorkouts() {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('*')
      .order('workout_date', { ascending: false, nullsFirst: false });
    return { data, error };
  },

  async getWorkoutByDate(workoutDate: string) {
    const { data, error } = await supabase
      .from(TABLE_WORKOUTS)
      .select('id, title')
      .eq('workout_date', workoutDate)
      .maybeSingle();
    return { data, error };
  },

  async getSectionNamesByWorkout(workoutId: string) {
    const { data, error } = await supabase
      .from(TABLE_SECTIONS)
      .select('section_name')
      .eq('workout_id', workoutId)
      .order('order_index');
    return { data, error };
  },

  async getSectionIdNamesByWorkout(workoutId: string) {
    const { data, error } = await supabase
      .from(TABLE_SECTIONS)
      .select('id, section_name')
      .eq('workout_id', workoutId)
      .order('order_index');
    return { data, error };
  },
};
