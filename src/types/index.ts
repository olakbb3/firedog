export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'athlete' | 'coach' | 'admin';
  points: number;
  completed_workouts: number;
}

export interface Exercise {
  name: string;
  reps?: number;
  sets?: number;
  duration?: string;
  notes?: string;
}

export interface Workout {
  id: string;
  title: string;
  description: string;
  exercises: Exercise[];
  coach_notes?: string;
  video_url?: string;
  date: string;
  program_id?: string;
}

export interface WorkoutLog {
  id: string;
  user_id: string;
  workout_id: string;
  reps?: number;
  weight?: number;
  time?: string;
  notes?: string;
  completion_date: string;
}

export interface Program {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_weeks: number;
  cover_image?: string;
  workouts: Workout[];
  is_purchased?: boolean;
}

export interface LeaderboardEntry {
  user_id: string;
  user_name: string;
  avatar: string;
  total_points: number;
  workouts_completed: number;
}

export interface MediaAsset {
  id: string;
  file_url: string;
  file_type: string;
  title: string;
  uploaded_by: string;
  upload_date: string;
}

export interface HomeContent {
  featured_workout_id?: string;
  featured_program_id?: string;
  banner_image?: string;
  banner_text?: string;
  motivational_quote?: string;
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  participants: number;
}
