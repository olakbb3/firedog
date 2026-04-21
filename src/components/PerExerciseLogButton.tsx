import { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
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
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';
import type { ExerciseRow, SectionResultType } from '@/types/index';
import { evaluatePRBatch, type PRCandidate, type PRLog } from '@/utils/personalRecords';

interface Props {
  workoutId: string;
  sectionId: string;
  sectionName: string;
  exercises: ExerciseRow[];
  resultType?: SectionResultType;
}

interface ExerciseLogEntry {
  exercise_name: string;
  weight?: number;
  reps?: number;
  time?: string;
  notes?: string;
  completion_date?: string;
}

export default function PerExerciseLogButton({ workoutId, sectionId, sectionName, exercises, resultType = 'weight' }: Props) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const submittingRef = useRef(false);

  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loggedExercises, setLoggedExercises] = useState<Set<string>>(new Set());

  // Per-exercise form values keyed by exercise name
  const [formValues, setFormValues] = useState<Record<string, string>>({});

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
    if (!requireAuth('Log Result')) return;
    // Initialize form values
    const initial: Record<string, string> = {};
    for (const ex of exercises) {
      initial[ex.exercise_name] = '';
    }
    setFormValues(initial);
    setOpen(true);
  };

  const getInputLabel = (): string => {
    switch (resultType) {
      case 'weight': return 'Weight';
      case 'time': return 'Time';
      case 'calories': return 'Calories';
      case 'meters': return 'Meters';
      case 'rounds_reps': return 'Reps';
      default: return 'Value';
    }
  };

  const handleSubmit = async () => {
    if (!user || submittingRef.current) return;

    const entries = exercises.filter(ex => formValues[ex.exercise_name]?.trim());
    if (entries.length === 0) {
      toast.error('Enter at least one value');
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

      // Fetch existing logs for this user/section in today's window
      const { data: existingLogs, error: findErr } = await supabase
        .from('workout_logs')
        .select('id, exercise_name, notes')
        .eq('user_id', user.id)
        .eq('workout_section_id', sectionId)
        .gte('completion_date', dayStart.toISOString())
        .lt('completion_date', dayEnd.toISOString());
      if (findErr) throw findErr;

      // Fetch ALL prior logs for this section across history (PR baseline) — exclude today
      const { data: priorAll } = await supabase
        .from('workout_logs')
        .select('exercise_name, notes, weight, reps, time, result_type, completion_date')
        .eq('user_id', user.id)
        .eq('workout_section_id', sectionId)
        .lt('completion_date', dayStart.toISOString());

      const candidates: PRCandidate[] = [];
      const priorLogs: PRLog[] = (priorAll ?? []).map((l: any) => ({
        workout_id: workoutId,
        workout_section_id: sectionId,
        exercise_name: l.exercise_name || l.notes || null,
        result_type: l.result_type,
        weight: l.weight ?? null,
        time: l.time ?? null,
        reps: l.reps ?? null,
        rounds: l.rounds ?? null,
      }));

      // Process each exercise: update if a log exists for it today, otherwise insert
      for (const ex of entries) {
        const value = formValues[ex.exercise_name].trim();
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
        if (resultType === 'weight' && !isNaN(numVal)) payload.weight = numVal;
        else if (resultType === 'time') payload.time = value;
        else if (resultType === 'calories' && !isNaN(numVal)) payload.calories = Math.round(numVal);
        else if (resultType === 'meters' && !isNaN(numVal)) payload.meters = Math.round(numVal);
        else if (resultType === 'rounds_reps' && !isNaN(numVal)) payload.reps = Math.round(numVal);
        else payload.weight = numVal || 0;

        // Backward-compat: older logs stored the exercise name in `notes`
        const existing = existingLogs?.find(
          (l: any) => (l.exercise_name || l.notes) === ex.exercise_name
        );

        if (existing?.id) {
          const { error: updateErr } = await supabase
            .from('workout_logs')
            .update(payload)
            .eq('id', existing.id);
          if (updateErr) throw updateErr;
        } else {
          const { error: insertErr } = await supabase.from('workout_logs').insert(payload);
          if (insertErr) throw insertErr;
        }

        candidates.push({
          label: ex.exercise_name,
          log: {
            workout_id: workoutId,
            workout_section_id: sectionId,
            exercise_name: ex.exercise_name,
            result_type: resultType,
            weight: payload.weight ?? null,
            time: payload.time ?? null,
            reps: payload.reps ?? null,
            rounds: payload.rounds ?? null,
            calories: payload.calories ?? null,
            meters: payload.meters ?? null,
          },
        });
      }

      // Single PR evaluation across the whole submission batch.
      const { hasPR, prItems } = evaluatePRBatch(candidates, priorLogs);

      // Only mark as logged in the UI AFTER the database confirms success
      setLoggedExercises(prev => {
        const next = new Set(prev);
        entries.forEach(ex => next.add(ex.exercise_name));
        return next;
      });

      setOpen(false);
      if (hasPR) {
        toast(
          prItems.length === 1 ? 'You beat your best 💪' : 'New bests set today 💪',
          { duration: 4000 }
        );
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
                    value={formValues[ex.exercise_name] || ''}
                    onChange={e => setFormValues(prev => ({ ...prev, [ex.exercise_name]: e.target.value }))}
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
