import { useState, useRef, useEffect } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import dalmatianReward from '@/assets/dalmatian-reward.jpeg';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { createWorkoutLog } from '@/services/workoutLog.service';
import { buildWorkoutLogPayload } from '@/services/workoutLogFactory';
import { parseWeightToLbs, useUnitPreference } from '@/lib/units';
import {
  evaluatePRBatch,
  PR_LOG_COLUMNS,
  type PRLog,
} from '@/utils/personalRecords';

import MovementSelector, { type Movement } from '@/components/workout/MovementSelector';

type FreestyleResultType = 'weight' | 'time' | 'rounds_reps' | 'calories' | 'meters';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLogged?: () => void;
}

const RESULT_TYPE_LABELS: Record<FreestyleResultType, string> = {
  weight: 'Weight',
  time: 'Time',
  rounds_reps: 'Reps',
  calories: 'Calories',
  meters: 'Meters',
};

const autoFormatTime = (raw: string): string => {
  const digits = raw.replace(/\D/g, '').slice(0, 6);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) {
    return digits.slice(0, digits.length - 2) + ':' + digits.slice(digits.length - 2);
  }
  return (
    digits.slice(0, digits.length - 4) +
    ':' +
    digits.slice(digits.length - 4, digits.length - 2) +
    ':' +
    digits.slice(digits.length - 2)
  );
};

const validateTimeFormat = (t: string) => /^(\d{1,3}:)?\d{1,3}:\d{2}$/.test(t);

export default function FreestyleLogModal({ open, onOpenChange, onLogged }: Props) {
  const { user } = useAuth();
  const unit = useUnitPreference(user?.id);
  const submittingRef = useRef(false);

  const [movement, setMovement] = useState<Movement | null>(null);
  const [movementName, setMovementName] = useState('');
  const [resultType, setResultType] = useState<FreestyleResultType>('weight');
  const [valueStr, setValueStr] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setMovement(null);
    setMovementName('');
    setResultType('weight');
    setValueStr('');
    setNotes('');
    setError('');
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const validate = (): boolean => {
    setError('');
    const displayName = movement?.name?.trim() || movementName.trim();
    if (!displayName) {
      setError('Movement name is required');
      return false;
    }
    if (!valueStr.trim()) {
      setError('Enter a result');
      return false;
    }
    switch (resultType) {
      case 'weight':
        if (!parseWeightToLbs(valueStr, unit)) {
          setError('Enter a weight greater than 0');
          return false;
        }
        return true;
      case 'time':
        if (!validateTimeFormat(valueStr.trim())) {
          setError('Enter a valid time (mm:ss or hh:mm:ss)');
          return false;
        }
        return true;
      case 'rounds_reps':
      case 'calories':
      case 'meters': {
        const n = parseInt(valueStr, 10);
        if (!Number.isFinite(n) || n <= 0) {
          setError('Enter a number greater than 0');
          return false;
        }
        return true;
      }
    }
  };

  const handleSubmit = async () => {
    if (!user || submittingRef.current) return;
    if (!validate()) return;

    submittingRef.current = true;
    setSubmitting(true);

    try {
      const completionDateIso = new Date().toISOString();
      // Strict mutual exclusivity: movement_id XOR exercise_name.
      const usingMovement = !!movement?.id;
      const displayLabel = usingMovement
        ? (movement?.name ?? movementName.trim())
        : movementName.trim();

      const weight = resultType === 'weight' ? (parseWeightToLbs(valueStr, unit) ?? 0) : null;
      const time = resultType === 'time' ? valueStr.trim() : null;
      const rounds = resultType === 'rounds_reps' ? 0 : null;
      const reps = resultType === 'rounds_reps' ? Math.max(0, parseInt(valueStr, 10)) : null;
      const calories = resultType === 'calories' ? Math.max(0, parseInt(valueStr, 10)) : null;
      const meters = resultType === 'meters' ? Math.max(0, parseInt(valueStr, 10)) : null;

      const payload = buildWorkoutLogPayload({
        userId: user.id,
        workoutId: null,
        sectionId: null,
        movementId: usingMovement ? (movement?.id ?? null) : null,
        exerciseName: usingMovement ? null : (displayLabel ?? null),
        resultType,
        isRx: true,
        completionDate: completionDateIso,
        weight,
        time,
        rounds,
        reps,
        calories,
        meters,
        notes: notes.trim() ? notes.trim() : null,
      });

      // Fetch prior logs for PR evaluation BEFORE insert
      const { data: priorRows } = await supabase
        .from('workout_logs')
        .select(PR_LOG_COLUMNS)
        .eq('user_id', user.id);
      const priorLogs: PRLog[] = (priorRows ?? []) as unknown as PRLog[];

      const candidate: PRLog = {
        workout_id: null,
        workout_section_id: null,
        movement_id: payload.movement_id,
        exercise_name: payload.exercise_name,
        result_type: resultType,
        weight: payload.weight ?? null,
        time: payload.time ?? null,
        rounds: payload.rounds ?? null,
        reps: payload.reps ?? null,
        calories: payload.calories ?? null,
        meters: payload.meters ?? null,
      };
      const { hasPR, prItems } = evaluatePRBatch(
        [{ label: displayLabel, log: candidate }],
        priorLogs
      );

      const { data, error: insertErr } = await createWorkoutLog(payload);
      const logId = data?.id;
      if (insertErr) {
        console.error('Workout log insert failed:', insertErr);
        throw new Error(insertErr);
      }

      // Close modal FIRST so Radix can fully unmount the overlay
      // before any toast / state change interrupts its exit animation.
      reset();
      onOpenChange(false);
      onLogged?.();

      // Defer toast slightly so it renders after the dialog has closed,
      // avoiding the stuck-backdrop / pointer-events:none body bug.
      setTimeout(() => {
        if (hasPR) {
          const msg =
            prItems.length === 1
              ? `New PR on ${prItems[0]} 💪 Saved to your history.`
              : 'New best 💪 Saved to your history.';
          toast.success(msg, { duration: 3500 });
        } else {
          toast.success(
            <div className="flex items-center gap-3">
              <img src={dalmatianReward} alt="Logged" className="w-14 h-14 rounded-lg object-cover" />
              <div className="flex flex-col">
                <span className="font-semibold text-sm">Workout logged 🐾</span>
                <span className="text-xs text-muted-foreground">Saved to your history</span>
              </div>
            </div>,
            { duration: 3000 }
          );
        }
      }, 150);
    } catch (err: any) {
      toast.error('Failed to save. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const valuePlaceholder = (() => {
    switch (resultType) {
      case 'weight':
        return unit === 'metric' ? 'e.g., 100 (kg)' : 'e.g., 225 (lbs)';
      case 'time':
        return 'e.g., 8:00 or 1:08:00';
      case 'rounds_reps':
        return 'e.g., 50';
      case 'calories':
        return 'e.g., 30';
      case 'meters':
        return 'e.g., 2000';
    }
  })();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-sm bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-center text-sm tracking-widest text-muted-foreground">
            QUICK LOG
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 mt-1">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Movement</Label>
            <MovementSelector
              movement={movement}
              customName={movementName}
              onSelectMovement={(m) => {
                setMovement(m);
                setMovementName('');
                const drt = m.default_result_type as FreestyleResultType;
                if (
                  drt === 'weight' || drt === 'time' || drt === 'rounds_reps' ||
                  drt === 'calories' || drt === 'meters'
                ) {
                  setResultType(drt);
                  setValueStr('');
                }
              }}
              onCustomNameChange={(name) => {
                setMovement(null);
                setMovementName(name);
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={resultType} onValueChange={(v) => { setResultType(v as FreestyleResultType); setValueStr(''); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(RESULT_TYPE_LABELS) as FreestyleResultType[]).map((rt) => (
                    <SelectItem key={rt} value={rt}>{RESULT_TYPE_LABELS[rt]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="value-input" className="text-xs text-muted-foreground">
                Result {resultType === 'weight' ? `(${unit === 'metric' ? 'kg' : 'lbs'})` : ''}
              </Label>
              <Input
                id="value-input"
                inputMode={resultType === 'time' ? 'numeric' : 'decimal'}
                placeholder={valuePlaceholder}
                value={valueStr}
                onChange={(e) => {
                  if (resultType === 'time') {
                    setValueStr(autoFormatTime(e.target.value));
                  } else {
                    setValueStr(e.target.value);
                  }
                }}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-xs text-muted-foreground">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Anything to remember?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              rows={2}
            />
          </div>

          {error && (
            <p className="text-xs text-destructive font-semibold text-center">{error}</p>
          )}

          <Button
            className="w-full"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving…' : 'Log Workout'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
