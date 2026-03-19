import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Clock, Dumbbell, Play, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';
import type { WorkoutSection, ExerciseRow } from '@/types/index';

interface WorkoutData {
  id: string;
  title: string;
  description: string;
  exercises: any[];
  coach_notes: string | null;
  video_url: string | null;
  date: string;
  workout_date: string | null;
}

const WorkoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [sections, setSections] = useState<WorkoutSection[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [showLog, setShowLog] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [logData, setLogData] = useState({ reps: '', weight: '', time: '', notes: '' });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const fetchWorkout = async () => {
      setLoading(true);
      const [workoutRes, sectionsRes, exercisesRes] = await Promise.all([
        supabase.from('workouts').select('*').eq('id', id).maybeSingle(),
        supabase.from('workout_sections').select('*').eq('workout_id', id).order('order_index'),
        supabase.from('exercises').select('*').eq('workout_id', id).order('order_index'),
      ]);
      if (workoutRes.data) setWorkout(workoutRes.data);
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (exercisesRes.data) setExercises(exercisesRes.data);
      setLoading(false);
    };
    fetchWorkout();
  }, [id]);

  // Group exercises by section. Legacy exercises (no section_id) go under "Workout"
  const groupedSections = (() => {
    if (sections.length > 0) {
      const groups = sections.map(s => ({
        ...s,
        exercises: exercises.filter(e => e.section_id === s.id).sort((a, b) => a.order_index - b.order_index),
      }));
      // Add unsectioned exercises under a default group
      const unsectioned = exercises.filter(e => !e.section_id);
      if (unsectioned.length > 0) {
        groups.push({
          id: 'legacy',
          workout_id: id || '',
          section_name: 'Workout',
          order_index: -1,
          exercises: unsectioned,
        });
        groups.sort((a, b) => (a.order_index === -1 ? -1 : a.order_index) - (b.order_index === -1 ? -1 : b.order_index));
      }
      return groups.filter(g => g.exercises.length > 0);
    }
    // No sections at all — use exercises or JSON fallback
    if (exercises.length > 0) {
      return [{
        id: 'default',
        workout_id: id || '',
        section_name: 'Workout',
        order_index: 0,
        exercises: exercises,
      }];
    }
    // JSON fallback from old workouts.exercises column
    if (workout?.exercises?.length) {
      return [{
        id: 'json-fallback',
        workout_id: id || '',
        section_name: 'Workout',
        order_index: 0,
        exercises: workout.exercises.map((e: any, i: number) => ({
          id: `json-${i}`,
          workout_id: id || '',
          section_id: null,
          exercise_name: e.name || e.exercise_name || '',
          sets: e.sets ?? null,
          reps: e.reps ?? null,
          duration: e.duration ?? null,
          notes: e.notes ?? null,
          order_index: i,
        })),
      }];
    }
    return [];
  })();

  const handleStartWorkout = () => {
    if (!requireAuth('Start Workout')) return;
    setShowLog(true);
  };

  const handleComplete = () => {
    if (!requireAuth('Save Result')) return;
    setCompleted(true);
    setShowLog(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-muted-foreground">Workout not found.</p>
        <Button variant="outline" onClick={() => navigate('/')} className="mt-4">Go Home</Button>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm">Back</span>
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold">{workout.title}</h1>
        <p className="text-muted-foreground mt-1">{workout.description}</p>
        {workout.workout_date && (
          <p className="text-xs text-muted-foreground mt-1">{workout.workout_date}</p>
        )}
      </div>

      {/* Sectioned Exercise List */}
      <div className="space-y-6 mb-6">
        {groupedSections.map((section) => (
          <div key={section.id}>
            <div className="flex items-center gap-2 mb-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs font-bold font-display text-primary tracking-wider">{section.section_name.toUpperCase()}</span>
              <div className="h-px flex-1 bg-border" />
            </div>
            <div className="space-y-3">
              {section.exercises.map((ex) => (
                <div key={ex.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold font-display">{ex.exercise_name}</h3>
                      <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                        {ex.sets && (
                          <span className="flex items-center gap-1">
                            <Dumbbell className="h-3.5 w-3.5" />
                            {ex.sets} sets
                          </span>
                        )}
                        {ex.reps && <span>{ex.reps} reps</span>}
                        {ex.duration && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {ex.duration}
                          </span>
                        )}
                      </div>
                    </div>
                    {workout.video_url && (
                      <button className="rounded-lg bg-secondary p-2 text-muted-foreground hover:text-foreground">
                        <Play className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                  {ex.notes && (
                    <div className="mt-2 border-t border-border pt-2">
                      <p className="text-xs text-primary font-semibold mb-0.5">COACH NOTE</p>
                      <p className="text-xs text-muted-foreground italic">{ex.notes}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Completed State */}
      {completed ? (
        <div className="rounded-xl gradient-fire p-6 text-center shadow-fire">
          <CheckCircle2 className="h-12 w-12 mx-auto text-primary-foreground mb-3" />
          <h2 className="text-xl font-bold text-primary-foreground">WORKOUT COMPLETE!</h2>
          <p className="text-sm text-primary-foreground/80 mt-1">+25 points earned</p>
        </div>
      ) : (
        <>
          {showLog ? (
            <div className="rounded-xl bg-card border border-border p-5 mb-4 shadow-card">
              <h3 className="font-bold font-display mb-4">LOG YOUR RESULTS</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Reps</label>
                  <Input value={logData.reps} onChange={e => setLogData(d => ({...d, reps: e.target.value}))} className="bg-secondary" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Weight (lbs)</label>
                  <Input value={logData.weight} onChange={e => setLogData(d => ({...d, weight: e.target.value}))} className="bg-secondary" placeholder="0" />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Time</label>
                  <Input value={logData.time} onChange={e => setLogData(d => ({...d, time: e.target.value}))} className="bg-secondary" placeholder="00:00" />
                </div>
              </div>
              <Textarea
                value={logData.notes}
                onChange={e => setLogData(d => ({...d, notes: e.target.value}))}
                placeholder="Notes (optional)"
                className="bg-secondary mb-4"
                rows={2}
              />
              <Button onClick={handleComplete} className="w-full gradient-fire text-primary-foreground font-display text-lg shadow-fire">
                COMPLETE WORKOUT
              </Button>
            </div>
          ) : (
            <Button onClick={handleStartWorkout} className="w-full gradient-fire text-primary-foreground font-display text-lg shadow-fire py-6">
              {user ? 'MARK WORKOUT COMPLETED' : 'START WORKOUT'}
            </Button>
          )}
        </>
      )}
    </div>
  );
};

export default WorkoutPage;
