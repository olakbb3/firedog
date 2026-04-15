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
      const rows = entries.map(ex => {
        const value = formValues[ex.exercise_name].trim();
        const payload: Record<string, any> = {
          user_id: user.id,
          workout_id: workoutId,
          workout_section_id: sectionId,
          result_type: resultType,
          is_rx: true,
          completion_date: new Date().toISOString(),
          exercise_name: ex.exercise_name,
          notes: ex.notes || null,
        };

        // Store value in the appropriate column based on result_type
        const numVal = parseFloat(value);
        if (resultType === 'weight' && !isNaN(numVal)) payload.weight = numVal;
        else if (resultType === 'time') payload.time = value;
        else if (resultType === 'calories' && !isNaN(numVal)) payload.calories = Math.round(numVal);
        else if (resultType === 'meters' && !isNaN(numVal)) payload.meters = Math.round(numVal);
        else if (resultType === 'rounds_reps' && !isNaN(numVal)) payload.reps = Math.round(numVal);
        else payload.weight = numVal || 0; // fallback

        return payload;
      });

      const { error } = await supabase.from('workout_logs').insert(rows);
      if (error) throw error;

      setLoggedExercises(prev => {
        const next = new Set(prev);
        entries.forEach(ex => next.add(ex.exercise_name));
        return next;
      });

      setOpen(false);
      toast(
        <div className="flex items-center gap-3">
          <img src={dalmatianReward} alt="Got that dog in me" className="w-16 h-16 rounded-lg object-cover" />
          <span className="font-semibold text-sm">Lifts logged! 🐾</span>
        </div>,
        { duration: 3000 }
      );
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
