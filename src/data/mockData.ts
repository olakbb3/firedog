import { User, Workout, WorkoutLog, Program, LeaderboardEntry, Challenge, HomeContent } from '@/types';

export const mockUser: User = {
  id: '1',
  name: 'Jake "Blaze" Mitchell',
  email: 'jake@firedogworks.com',
  avatar: '',
  role: 'athlete',
  points: 2450,
  completed_workouts: 87,
};

export const mockAdminUser: User = {
  id: '2',
  name: 'Coach Riley',
  email: 'coach@firedogworks.com',
  avatar: '',
  role: 'admin',
  points: 0,
  completed_workouts: 0,
};

export const mockWorkouts: Workout[] = [
  {
    id: 'wod-1',
    title: 'ENGINE',
    description: 'High-intensity firefighter conditioning. Push through the flames.',
    exercises: [
      { name: 'Deadlifts', reps: 15, sets: 5, notes: 'Heavy — go 80% 1RM' },
      { name: 'Box Jumps', reps: 20, sets: 4 },
      { name: 'Sled Push', duration: '40m', sets: 6 },
      { name: 'Burpees', reps: 15, sets: 3 },
      { name: 'Battle Ropes', duration: '30s', sets: 5 },
    ],
    coach_notes: 'This is a grind session. Focus on form over speed. Rest 60-90s between sets. Hydrate.',
    date: new Date().toISOString().split('T')[0],
  },
  {
    id: 'wod-2',
    title: 'LADDER CLIMB',
    description: 'Progressive overload — each round gets heavier.',
    exercises: [
      { name: 'Back Squats', reps: 10, sets: 5, notes: 'Add 10lbs each set' },
      { name: 'Pull-ups', reps: 12, sets: 4 },
      { name: 'Kettlebell Swings', reps: 20, sets: 4, notes: '53lb KB' },
      { name: 'Plank Hold', duration: '60s', sets: 3 },
    ],
    coach_notes: 'Build up slow. This is about progressive strength, not speed.',
    date: new Date(Date.now() - 86400000).toISOString().split('T')[0],
  },
  {
    id: 'wod-3',
    title: 'SMOKE EATER',
    description: 'Cardio endurance with functional movements.',
    exercises: [
      { name: 'Rowing', duration: '500m', sets: 4 },
      { name: 'Thrusters', reps: 15, sets: 4 },
      { name: 'Wall Balls', reps: 20, sets: 3 },
      { name: 'Rope Climbs', reps: 3, sets: 3 },
    ],
    coach_notes: 'Pace yourself. This is about sustained output.',
    date: new Date(Date.now() - 172800000).toISOString().split('T')[0],
  },
];

export const mockWorkoutLogs: WorkoutLog[] = [
  { id: 'log-1', user_id: '1', workout_id: 'wod-2', reps: 50, weight: 225, time: '42:30', notes: 'Felt strong', completion_date: new Date(Date.now() - 86400000).toISOString() },
  { id: 'log-2', user_id: '1', workout_id: 'wod-3', reps: 62, weight: 135, time: '38:15', notes: 'Good cardio day', completion_date: new Date(Date.now() - 172800000).toISOString() },
  { id: 'log-3', user_id: '1', workout_id: 'wod-1', weight: 275, time: '45:00', completion_date: new Date(Date.now() - 259200000).toISOString() },
  { id: 'log-4', user_id: '1', workout_id: 'wod-2', reps: 55, weight: 235, time: '40:00', completion_date: new Date(Date.now() - 345600000).toISOString() },
  { id: 'log-5', user_id: '1', workout_id: 'wod-1', weight: 265, time: '47:20', completion_date: new Date(Date.now() - 432000000).toISOString() },
];

export const mockLeaderboard: LeaderboardEntry[] = [
  { user_id: '10', user_name: 'Marcus "Iron" Cole', avatar: '', total_points: 3200, workouts_completed: 112 },
  { user_id: '11', user_name: 'Sarah Blaze', avatar: '', total_points: 2980, workouts_completed: 105 },
  { user_id: '1', user_name: 'Jake "Blaze" Mitchell', avatar: '', total_points: 2450, workouts_completed: 87 },
  { user_id: '12', user_name: 'Tommy Knox', avatar: '', total_points: 2100, workouts_completed: 78 },
  { user_id: '13', user_name: 'Elena Fuentes', avatar: '', total_points: 1950, workouts_completed: 72 },
  { user_id: '14', user_name: 'Derek Stone', avatar: '', total_points: 1800, workouts_completed: 65 },
  { user_id: '15', user_name: 'Kai Nakamura', avatar: '', total_points: 1650, workouts_completed: 60 },
  { user_id: '16', user_name: 'Bri Martinez', avatar: '', total_points: 1500, workouts_completed: 55 },
];

export const mockPrograms: Program[] = [];
export const mockChallenges: Challenge[] = [];

export const mockHomeContent: HomeContent = {
  featured_workout_id: 'wod-1',
  featured_program_id: 'prog-2',
  banner_text: 'FORGE YOUR FIRE',
  motivational_quote: '"The fire inside you burns brighter than the fire around you." — Unknown',
};
