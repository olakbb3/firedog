import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import type { WorkoutSection, ExerciseRow } from '@/types/index';
import { parseTextWithLinks, extractLinkButtons, LinkButtons } from '@/lib/urlParser';
import SectionLogButton from '@/components/SectionLogButton';
import WorkoutTimer from '@/components/WorkoutTimer';
import { useLeaderboard } from '@/hooks/useLeaderboard';

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

const WorkoutPage = () => {
  
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [sections, setSections] = useState<WorkoutSection[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Performance & leaderboard
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>({ lastDate: null, bestResult: null, completedCount: 0 });
  const [timerResult, setTimerResult] = useState<string | null>(null);
  const { crew } = useLeaderboard(id, sections);

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

  // Fetch performance snapshot
  useEffect(() => {
    if (!id || !user) return;
    const fetchPerformance = async () => {
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
    };
    fetchPerformance();
  }, [id, user]);

  const isFiredogTotal = workout?.title === 'Firedog Total';

  // Firedog Total month info
  const challengeMonth = new Date().toLocaleString('default', { month: 'long' });
  const daysLeft = (() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();

  // Group exercises by section (deduplicate sections by name)
  const groupedSections = (() => {
    if (sections.length > 0) {
      const uniqueSections: WorkoutSection[] = [];
      const seenNames = new Set<string>();
      for (const s of sections) {
        if (!seenNames.has(s.section_name)) {
          seenNames.add(s.section_name);
          uniqueSections.push(s);
        }
      }

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

      {/* === FIREDOG TOTAL CHALLENGE HEADER === */}
      {isFiredogTotal && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-4 text-center">
          <p className="text-2xl font-bold font-display">🔥 FIREDOG TOTAL</p>
          <p className="text-sm text-muted-foreground mt-1">Monthly Strength Challenge</p>
          <p className="text-xs text-foreground mt-2">Test your max lifts and see where you rank.</p>
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="text-xs font-semibold text-primary">{challengeMonth} Challenge</span>
            <span className="text-xs text-muted-foreground">• Ends in {daysLeft} days</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Log your best lifts anytime this month. You can update your score as you improve.
          </p>
        </div>
      )}

      {/* === WHITEBOARD CONTAINER === */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight leading-tight">{workout.title}</h1>

        {/* Metadata row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body">
          <span>{parseTextWithLinks(workout.description)}</span>
          {workout.workout_date && (
            <>
              <span className="text-border">•</span>
              <span>{workout.workout_date}</span>
            </>
          )}
        </div>
        <LinkButtons links={extractLinkButtons(workout.description)} />

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

        {/* === WORKOUT TIMER (hidden for Firedog Total) === */}
        {!isFiredogTotal && (
          <WorkoutTimer
            workoutTitle={workout.title}
            workoutDescription={workout.description || ''}
            sectionNames={groupedSections.map(s => s.section_name)}
            onTimerStop={setTimerResult}
          />
        )}

        {/* === MOVEMENT LIST WITH PER-SECTION LOGGING === */}
        <div className="mt-5 space-y-5">
          {groupedSections.map((section) => (
            <div key={section.id}>
              {/* Section header */}
              <p className="text-xs font-bold text-primary tracking-widest mb-2">
                {isFiredogTotal ? `🏋️ MAX LIFT — ${section.section_name.toUpperCase()}` : section.section_name.toUpperCase()}
              </p>
              <div className="space-y-1">
                {section.exercises.map((ex) => (
                  <div key={ex.id} className="py-1">
                    <p className="text-sm font-body text-foreground leading-snug">
                      {formatExLine(ex)}
                    </p>
                    {ex.notes && (
                      <p className="text-xs text-muted-foreground italic mt-0.5 font-body">{parseTextWithLinks(ex.notes)}</p>
                    )}
                    <LinkButtons links={extractLinkButtons(ex.notes)} />
                  </div>
                ))}
              </div>
              {/* Per-section Log Result button */}
              <SectionLogButton
                workoutId={workout.id}
                sectionId={section.id}
                sectionName={section.section_name}
                resultType={(section as any).result_type || 'completed'}
              />
            </div>
          ))}
        </div>

        {/* Coach Notes */}
        {workout.coach_notes && (
          <div className="mt-5 border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-body mb-1">Coach Notes</p>
            <p className="text-xs text-muted-foreground italic font-body leading-relaxed">{parseTextWithLinks(workout.coach_notes)}</p>
            <LinkButtons links={extractLinkButtons(workout.coach_notes)} />
          </div>
        )}
      </div>

      {/* === STATION CREW MINI-LEADERBOARD === */}
      <div className="rounded-xl border border-border bg-card p-4 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-accent" />
          <p className="text-xs font-bold tracking-widest">{isFiredogTotal ? 'TOP PERFORMERS THIS MONTH' : 'TOP CREW'}</p>
        </div>
        {crew.length > 0 ? (
          <div className="space-y-1.5">
            {crew.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm font-body">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                  <span className={i === 0 ? 'text-accent font-semibold' : 'text-foreground'}>{entry.user_name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{entry.result}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${entry.is_rx ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {entry.is_rx ? 'Rx' : 'SC'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-body text-center py-3 italic">
            The leaderboard is empty. Be the first to set the pace!
          </p>
        )}
      </div>
    </div>
  );
};

export default WorkoutPage;
