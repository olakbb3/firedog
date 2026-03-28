import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock, Hash, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

interface PerformanceSnapshot {
  lastDate: string | null;
  bestResult: string | null;
  completedCount: number;
}

interface CrewEntry {
  user_name: string;
  result: string;
}

const WorkoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [sections, setSections] = useState<WorkoutSection[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Performance & leaderboard
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>({ lastDate: null, bestResult: null, completedCount: 0 });
  const [crew, setCrew] = useState<CrewEntry[]>([]);

  // Logging flow
  const [rxModalOpen, setRxModalOpen] = useState(false);
  const [isRx, setIsRx] = useState(true);
  const [showLogForm, setShowLogForm] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [logData, setLogData] = useState({ reps: '', weight: '', time: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

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

  // Fetch performance snapshot & crew leaderboard
  useEffect(() => {
    if (!id) return;
    const fetchPerformance = async () => {
      // User snapshot
      if (user) {
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('completion_date, time, reps')
          .eq('workout_id', id)
          .eq('user_id', user.id)
          .order('completion_date', { ascending: false });

        if (logs && logs.length > 0) {
          const bestTime = logs
            .filter(l => l.time)
            .sort((a, b) => (a.time || '').localeCompare(b.time || ''))[0]?.time;
          const bestReps = logs
            .filter(l => l.reps)
            .sort((a, b) => (b.reps || 0) - (a.reps || 0))[0]?.reps;

          setSnapshot({
            lastDate: logs[0].completion_date ? new Date(logs[0].completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null,
            bestResult: bestTime || (bestReps ? `${bestReps} reps` : null),
            completedCount: logs.length,
          });
        }
      }

      // Crew top 5
      const { data: crewLogs } = await supabase
        .from('workout_logs')
        .select('user_id, time, reps, completion_date')
        .eq('workout_id', id)
        .order('time', { ascending: true })
        .limit(20);

      if (crewLogs && crewLogs.length > 0) {
        // Deduplicate by user, keep best
        const bestByUser = new Map<string, { time: string | null; reps: number | null }>();
        for (const log of crewLogs) {
          const existing = bestByUser.get(log.user_id);
          if (!existing) {
            bestByUser.set(log.user_id, { time: log.time, reps: log.reps });
          }
        }

        // Fetch names
        const userIds = Array.from(bestByUser.keys());
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const nameMap = new Map((profiles || []).map(p => [p.id, p.full_name || 'Athlete']));

        const entries: CrewEntry[] = userIds.slice(0, 5).map(uid => {
          const best = bestByUser.get(uid)!;
          return {
            user_name: nameMap.get(uid) || 'Athlete',
            result: best.time || (best.reps ? `${best.reps} reps` : '—'),
          };
        });
        setCrew(entries);
      }
    };
    fetchPerformance();
  }, [id, user]);

  // Group exercises by section (deduplicate sections by name)
  const groupedSections = (() => {
    if (sections.length > 0) {
      // Deduplicate sections by section_name, keeping the first occurrence
      const uniqueSections: WorkoutSection[] = [];
      const seenNames = new Set<string>();
      for (const s of sections) {
        if (!seenNames.has(s.section_name)) {
          seenNames.add(s.section_name);
          uniqueSections.push(s);
        }
      }

      // Collect all section IDs that share a name so exercises from duplicates are included
      const nameToIds = new Map<string, string[]>();
      for (const s of sections) {
        const ids = nameToIds.get(s.section_name) || [];
        ids.push(s.id);
        nameToIds.set(s.section_name, ids);
      }

      const groups = uniqueSections.map(s => {
        const allIds = nameToIds.get(s.section_name) || [s.id];
        return {
          ...s,
          exercises: exercises
            .filter(e => allIds.includes(e.section_id || ''))
            .sort((a, b) => a.order_index - b.order_index)
            // Deduplicate exercises by exercise_name within a section
            .filter((ex, idx, arr) => arr.findIndex(e => e.exercise_name === ex.exercise_name && e.order_index === ex.order_index) === idx),
        };
      });

      const allSectionIds = sections.map(s => s.id);
      const unsectioned = exercises.filter(e => !e.section_id || !allSectionIds.includes(e.section_id));
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
    if (exercises.length > 0) {
      const deduped = exercises.filter((ex, idx, arr) =>
        arr.findIndex(e => e.exercise_name === ex.exercise_name && e.order_index === ex.order_index) === idx
      );
      return [{
        id: 'default',
        workout_id: id || '',
        section_name: 'Workout',
        order_index: 0,
        exercises: deduped,
      }];
    }
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

  const handleLogScoreTap = () => {
    if (!requireAuth('Log Score')) return;
    setRxModalOpen(true);
  };

  const handleRxChoice = (rx: boolean) => {
    setIsRx(rx);
    setRxModalOpen(false);
    setShowLogForm(true);
  };

  const handleSubmitLog = async () => {
    if (!user || !id) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.from('workout_logs').insert({
        user_id: user.id,
        workout_id: id,
        reps: logData.reps ? parseInt(logData.reps) : null,
        weight: logData.weight ? parseInt(logData.weight) : null,
        time: logData.time || null,
        notes: logData.notes ? `${isRx ? '[Rx]' : '[Scaled]'} ${logData.notes}` : (isRx ? 'Rx' : 'Scaled'),
        completion_date: new Date().toISOString(),
      });
      if (!error) {
        setCompleted(true);
        setShowLogForm(false);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Format exercise line
  const formatExLine = (ex: ExerciseRow) => {
    const parts: string[] = [];
    if (ex.reps && ex.sets) parts.push(`${ex.sets} x ${ex.reps}`);
    else if (ex.reps) parts.push(`${ex.reps}`);
    else if (ex.sets) parts.push(`${ex.sets} sets`);
    if (ex.duration) parts.push(ex.duration);
    const prefix = parts.length > 0 ? `${parts.join(' • ')} ` : '';
    return `${prefix}${ex.exercise_name}`;
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
      {/* Back */}
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-body">Back</span>
      </button>

      {/* === WHITEBOARD CONTAINER === */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight leading-tight">{workout.title}</h1>

        {/* Metadata row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body">
          <span>{workout.description}</span>
          {workout.workout_date && (
            <>
              <span className="text-border">•</span>
              <span>{workout.workout_date}</span>
            </>
          )}
        </div>

        {/* === ATHLETE SNAPSHOT === */}
        {user && (snapshot.lastDate || snapshot.completedCount > 0) && (
          <div className="mt-4 flex items-center gap-4 border-t border-border pt-3">
            {snapshot.lastDate && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Last</p>
                <p className="text-sm font-semibold font-body">{snapshot.lastDate}</p>
              </div>
            )}
            {snapshot.bestResult && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Best</p>
                <p className="text-sm font-semibold font-body">{snapshot.bestResult}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Done</p>
              <p className="text-sm font-semibold font-body">{snapshot.completedCount}×</p>
            </div>
          </div>
        )}

        {/* === MOVEMENT LIST === */}
        <div className="mt-5 space-y-5">
          {groupedSections.map((section) => (
            <div key={section.id}>
              {/* Section header */}
              <p className="text-xs font-bold text-primary tracking-widest mb-2">{section.section_name.toUpperCase()}</p>
              <div className="space-y-1">
                {section.exercises.map((ex) => (
                  <div key={ex.id} className="py-1">
                    <p className="text-sm font-body text-foreground leading-snug">
                      {formatExLine(ex)}
                    </p>
                    {ex.notes && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 font-body">{ex.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Coach Notes */}
        {workout.coach_notes && (
          <div className="mt-5 border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-body mb-1">Coach Notes</p>
            <p className="text-xs text-muted-foreground italic font-body leading-relaxed">{workout.coach_notes}</p>
          </div>
        )}
      </div>

      {/* === STATION CREW MINI-LEADERBOARD === */}
      {crew.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-accent" />
            <p className="text-xs font-bold tracking-widest">TOP CREW</p>
          </div>
          <div className="space-y-1.5">
            {crew.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm font-body">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                  <span className={i === 0 ? 'text-accent font-semibold' : 'text-foreground'}>{entry.user_name}</span>
                </span>
                <span className="text-muted-foreground text-xs">{entry.result}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === LOG SCORE / COMPLETED STATE === */}
      {completed ? (
        <div className="rounded-xl gradient-fire p-5 text-center shadow-fire">
          <Flame className="h-10 w-10 mx-auto text-primary-foreground mb-2" />
          <h2 className="text-xl font-bold text-primary-foreground">LOGGED</h2>
          <p className="text-sm text-primary-foreground/80 mt-1">{isRx ? 'Rx' : 'Scaled'} • +25 points</p>
        </div>
      ) : showLogForm ? (
        <div className="rounded-xl border border-border bg-card p-5 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold tracking-widest">LOG RESULT</h3>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isRx ? 'bg-primary/20 text-primary' : 'bg-secondary text-muted-foreground'}`}>
              {isRx ? 'Rx' : 'SCALED'}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Reps</label>
              <Input value={logData.reps} onChange={e => setLogData(d => ({...d, reps: e.target.value}))} className="bg-secondary" placeholder="0" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Weight</label>
              <Input value={logData.weight} onChange={e => setLogData(d => ({...d, weight: e.target.value}))} className="bg-secondary" placeholder="lbs" />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Time</label>
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
          <Button
            onClick={handleSubmitLog}
            disabled={submitting}
            className="w-full gradient-fire text-primary-foreground font-display text-lg shadow-fire"
          >
            {submitting ? 'SAVING...' : 'SUBMIT'}
          </Button>
        </div>
      ) : (
        <Button
          onClick={handleLogScoreTap}
          className="w-full gradient-fire text-primary-foreground font-display text-lg shadow-fire py-6"
        >
          LOG SCORE
        </Button>
      )}

      {/* === RX / SCALED MODAL === */}
      <Dialog open={rxModalOpen} onOpenChange={setRxModalOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-lg tracking-widest">HOW DID YOU PERFORM?</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() => handleRxChoice(true)}
              className="rounded-xl border-2 border-primary bg-primary/10 p-6 text-center hover:bg-primary/20 transition-colors"
            >
              <p className="text-lg font-bold text-primary">Rx</p>
              <p className="text-xs text-muted-foreground mt-1 font-body">As Prescribed</p>
            </button>
            <button
              onClick={() => handleRxChoice(false)}
              className="rounded-xl border-2 border-border bg-secondary p-6 text-center hover:border-muted-foreground transition-colors"
            >
              <p className="text-lg font-bold text-foreground">Scaled</p>
              <p className="text-xs text-muted-foreground mt-1 font-body">Modified</p>
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WorkoutPage;
