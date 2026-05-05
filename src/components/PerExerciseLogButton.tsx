import { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthGate } from '@/lib/authGate';
import dalmatianReward from '@/assets/dalmatian-reward.jpeg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { createWorkoutLog, type WorkoutLogPayload } from '@/services/workoutLog.service';
import { parseWeightToLbs, useUnitPreference } from '@/lib/units';
import type { ExerciseRow, SectionResultType } from '@/types/index';
import { evaluatePRBatch, PR_LOG_COLUMNS, type PRCandidate, type PRLog } from '@/utils/personalRecords';

interface Props {
  workoutId: string;
  sectionId: string;
  sectionName: string;
  exercises: ExerciseRow[];
  resultType?: SectionResultType;
  isFiredogTotal?: boolean;
}

interface ExerciseLogEntry {
  exercise_name: string;
  weight?: number;
  reps?: number;
  time?: string;
  notes?: string;
  completion_date?: string;
}

export default function PerExerciseLogButton({ workoutId, sectionId, sectionName, exercises, resultType = 'weight', isFiredogTotal = false }: Props) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const unit = useUnitPreference(user?.id);
  const submittingRef = useRef(false);
  const lastSubmitAtRef = useRef(0);
  const SUBMIT_DEDUPE_MS = 3000;
  const isSubmitLocked = () => {
    if (submittingRef.current) return true;
    if (Date.now() - lastSubmitAtRef.current < SUBMIT_DEDUPE_MS) return true;
    return false;
  };

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loggedExercises, setLoggedExercises] = useState<Set<string>>(new Set());

  // Per-exercise form values keyed by exercise.id (prevents collisions on duplicate names)
  const [inputValues, setInputValues] = useState<Record<string, string>>({});

  // Load existing logs for today
  useEffect(() => {
    if (!user || !sectionId) return;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    supabase
      .from('workout_logs')
      .select('exercise_name, notes, weight, reps, time, completion_date')
      .eq('workout_id', workoutId)
      .eq('workout_section_id', sectionId)
      .eq('user_id', user.id)
      .gte('completion_date', todayStart.toISOString())
      .then(({ data }) => {
        if (data && data.length > 0) {
          const logged = new Set<string>();
          for (const log of data) {
            // Backward compat: old logs used notes, new logs use exercise_name
            const name = (log as any).exercise_name || log.notes;
            if (name) logged.add(name);
          }
          setLoggedExercises(logged);
        }
      });
  }, [user, workoutId, sectionId]);

  const handleOpen = () => {
    requireAuth('log_workout', () => {
      const initial: Record<string, string> = {};
      for (const ex of exercises) {
        initial[ex.id] = '';
      }
      setInputValues(initial);
      setOpen(true);
    });
  };

  const getInputLabel = (): string => {
    switch (resultType) {
      case 'weight': return `Weight (${unit === 'metric' ? 'kg' : 'lbs'})`;
      case 'time': return 'Time';
      case 'calories': return 'Calories';
      case 'meters': return 'Meters';
      case 'rounds_reps': return 'Reps';
      default: return 'Value';
    }
  };

  const handleSubmit = async () => {
    if (!user || isSubmitLocked()) return;

    const entries = exercises.filter(ex => (inputValues[ex.id] || '').trim() !== '');
    if (entries.length === 0) {
      toast.error('Enter at least one value');
      return;
    }
    if (resultType === 'weight' && entries.some(ex => !parseWeightToLbs(inputValues[ex.id] || '', unit))) {
      toast.error('Enter weights greater than 0');
      return;
    }

    submittingRef.current = true;
    setSubmitting(true);

    try {
      // Day window for "already logged today?" check
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);
      const completionDateIso = new Date().toISOString();

      // STEP 1: Fetch ALL prior logs for this user BEFORE insert (no section filter).
      const { data: allPriorLogs } = await supabase
        .from('workout_logs')
        .select(PR_LOG_COLUMNS)
        .eq('user_id', user.id);

      const priorLogs: PRLog[] = (allPriorLogs ?? []) as PRLog[];

      // Build candidate logs from this submission for a single PR evaluation.
      const candidates: PRCandidate[] = entries.map((ex) => {
        const value = (inputValues[ex.id] || '').trim();
        const numVal = parseFloat(value);
        const log: PRLog = {
          workout_id: workoutId,
          workout_section_id: sectionId,
          exercise_name: ex.exercise_name,
          result_type: resultType,
          weight: resultType === 'weight' ? parseWeightToLbs(value, unit) : null,
          time: resultType === 'time' ? value : null,
          reps: resultType === 'rounds_reps' && !isNaN(numVal) ? Math.round(numVal) : null,
          rounds: null,
          calories: resultType === 'calories' && !isNaN(numVal) ? Math.round(numVal) : null,
          meters: resultType === 'meters' && !isNaN(numVal) ? Math.round(numVal) : null,
        };
        return { label: ex.exercise_name, log };
      });

      // STEP 2: Evaluate PRs against the dataset BEFORE the new logs exist.
      const { hasPR, prItems } = evaluatePRBatch(candidates, priorLogs);

      // STEP 3: Insert/update each exercise log.
      const { data: existingLogs, error: findErr } = await supabase
        .from('workout_logs')
        .select('id, exercise_name, notes')
        .eq('user_id', user.id)
        .eq('workout_section_id', sectionId)
        .gte('completion_date', dayStart.toISOString())
        .lt('completion_date', dayEnd.toISOString());
      if (findErr) throw findErr;

      for (const ex of entries) {
        const value = (inputValues[ex.id] || '').trim();
        const payload: Record<string, any> = {
          user_id: user.id,
          workout_id: workoutId,
          workout_section_id: sectionId,
          result_type: resultType,
          is_rx: true,
          completion_date: completionDateIso,
          exercise_name: ex.exercise_name,
          notes: ex.notes || null,
        };

        const numVal = parseFloat(value);
        if (resultType === 'weight') payload.weight = parseWeightToLbs(value, unit) ?? 0;
        else if (resultType === 'time') payload.time = value;
        else if (resultType === 'calories' && !isNaN(numVal)) payload.calories = Math.round(numVal);
        else if (resultType === 'meters' && !isNaN(numVal)) payload.meters = Math.round(numVal);
        else if (resultType === 'rounds_reps' && !isNaN(numVal)) payload.reps = Math.round(numVal);
        else payload.weight = numVal || 0;

        // Backward-compat: older logs stored the exercise name in `notes`
        const existing = existingLogs?.find(
          (l: any) => (l.exercise_name || l.notes) === ex.exercise_name
        );

        if (existing?.id && !isFiredogTotal) {
          const { error: updateErr } = await supabase
            .from('workout_logs')
            .update(payload)
            .eq('id', existing.id)
            .eq('user_id', user.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await createWorkoutLog(payload as WorkoutLogPayload);
          if (insertErr) throw new Error(insertErr);
        }
      }

      // Only mark as logged in the UI AFTER the database confirms success
      setLoggedExercises(prev => {
        const next = new Set(prev);
        entries.forEach(ex => next.add(ex.exercise_name));
        return next;
      });

      setOpen(false);

      // STEP 4: Toast based on the single evaluation result.
      if (isFiredogTotal && !hasPR) {
        toast('Your current best is higher — keep pushing!', { duration: 3500 });
      } else if (hasPR) {
        const msg = prItems.length === 1
          ? `You beat your best on ${prItems[0]} 💪`
          : 'New bests set today 💪';
        toast(msg, { duration: 4000 });
      } else {
        toast(
          <div className="flex items-center gap-3">
            <img src={dalmatianReward} alt="Got that dog in me" className="w-16 h-16 rounded-lg object-cover" />
            <span className="font-semibold text-sm">Workout logged 🐾</span>
          </div>,
          { duration: 3000 }
        );
      }
    } catch {
      toast.error('Failed to save. Check your connection and try again.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
      lastSubmitAtRef.current = Date.now();
    }
  };

  const allLoggedToday = exercises.length > 0 && exercises.every(ex => loggedExercises.has(ex.exercise_name));

  return (
    <>
      {allLoggedToday ? (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-body text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-semibold">{exercises.length} exercises logged</span>
          </div>
          <button onClick={handleOpen} className="text-[10px] text-muted-foreground underline font-body hover:text-foreground">
            Log again
          </button>
        </div>
      ) : (
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpen}
          className="mt-2 w-full border-primary text-primary hover:bg-primary/15 font-body text-xs tracking-wider"
        >
          LOG EACH EXERCISE
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-sm tracking-widest text-muted-foreground">
              {sectionName.toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          <p className="text-center text-xs text-muted-foreground font-body">
            Enter {getInputLabel().toLowerCase()} for each movement
          </p>

          <div className="mt-3 space-y-3">
            {exercises.map((ex) => (
              <div key={ex.id} className="flex items-center gap-3">
                <span className="text-sm font-body text-foreground flex-1 truncate">
                  {ex.exercise_name}
                </span>
                <div className="relative w-24">
                  <Input
                    type={resultType === 'time' ? 'text' : 'number'}
                    min="0"
                    step={resultType === 'weight' ? '0.5' : '1'}
                    value={inputValues[ex.id] ?? ''}
                    onChange={e => setInputValues(prev => ({ ...prev, [ex.id]: e.target.value }))}
                    className="bg-secondary text-sm h-9 font-mono text-right pr-2"
                    placeholder="0"
                    inputMode={resultType === 'time' ? 'text' : 'numeric'}
                  />
                </div>
                {loggedExercises.has(ex.exercise_name) && (
                  <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                )}
              </div>
            ))}

            <Button
              onClick={handleSubmit}
              disabled={submitting}
              className="w-full gradient-fire text-primary-foreground font-display text-lg shadow-fire"
            >
              {submitting ? 'SAVING...' : 'SUBMIT ALL'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
