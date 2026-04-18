import { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import dalmatianReward from '@/assets/dalmatian-reward.jpeg';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';
import type { SectionResultType, ExerciseRow } from '@/types/index';

interface SectionLogEntry {
  result_type: SectionResultType;
  is_rx: boolean;
  time?: string;
  rounds?: number;
  reps?: number;
  calories?: number;
  meters?: number;
  weight?: number;
  notes?: string;
  completion_date?: string;
}

interface Props {
  workoutId: string;
  sectionId: string;
  sectionName: string;
  resultType?: SectionResultType;
  exercises?: ExerciseRow[];
}

const RESULT_TYPE_LABELS: Record<SectionResultType, string> = {
  completed: 'Just Completed',
  time: 'Time',
  rounds_reps: 'Rounds + Reps',
  calories: 'Calories',
  meters: 'Meters',
  weight: 'Weight',
};

function formatLogSummary(entry: SectionLogEntry): string {
  switch (entry.result_type) {
    case 'completed': return 'Completed';
    case 'time': return entry.time || 'Timed';
    case 'rounds_reps': {
      const r = entry.rounds ?? 0;
      const reps = entry.reps ?? 0;
      if (reps === 0) return `${r}`;
      return `${r} + ${reps}`;
    }
    case 'calories': return (entry.calories !== null && entry.calories !== undefined) ? `${entry.calories} cal` : 'Logged';
    case 'meters': return (entry.meters !== null && entry.meters !== undefined) ? `${entry.meters} m` : 'Logged';
    case 'weight': return (entry.weight !== null && entry.weight !== undefined) ? `${entry.weight}` : 'Logged';
    default: return 'Logged';
  }
}

export default function SectionLogButton({ workoutId, sectionId, sectionName, resultType = 'completed', exercises = [] }: Props) {
  const isAmrap = resultType === 'rounds_reps';
  // Total reps required to complete one full round across all movements (AMRAP)
  const totalRoundReps = exercises.reduce((sum, ex) => sum + (ex.reps || 0), 0);
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const submittingRef = useRef(false);

  // If resultType is 'completed', skip straight to submit after Rx/Scaled
  const needsInput = resultType !== 'completed';

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<'rx' | 'input'>('rx');
  const [isRx, setIsRx] = useState(true);
  const [formData, setFormData] = useState({ time: '', rounds: '', reps: '', calories: '', meters: '', weight: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [loggedResults, setLoggedResults] = useState<SectionLogEntry[]>([]);

  useEffect(() => {
    if (!user || !sectionId) return;
    supabase
      .from('workout_logs')
      .select('result_type, is_rx, time, rounds, reps, calories, meters, weight, notes, completion_date')
      .eq('workout_id', workoutId)
      .eq('workout_section_id', sectionId)
      .eq('user_id', user.id)
      .order('completion_date', { ascending: false })
      .then(({ data }) => {
        if (data && data.length > 0) {
          setLoggedResults(data as SectionLogEntry[]);
        }
      });
  }, [user, workoutId, sectionId]);

  const resetModal = () => {
    setStep('rx');
    setIsRx(true);
    setFormData({ time: '', rounds: '', reps: '', calories: '', meters: '', weight: '', notes: '' });
    setValidationError('');
    setSubmitError('');
  };

  const handleOpen = () => {
    if (!requireAuth('Log Result')) return;
    if (!needsInput) {
      // 'completed' — skip modal, submit immediately with Rx=true
      handleSubmitCompleted();
      return;
    }
    resetModal();
    setOpen(true);
  };

  const handleSubmitCompleted = async () => {
    if (!user || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    const payload: Record<string, any> = {
      user_id: user.id,
      workout_id: workoutId,
      workout_section_id: sectionId,
      result_type: 'completed',
      is_rx: true,
      completion_date: new Date().toISOString(),
    };
    const newEntry: SectionLogEntry = { result_type: 'completed', is_rx: true, completion_date: payload.completion_date };
    try {
      const { error } = await supabase.from('workout_logs').insert(payload);
      if (error) throw error;
      setLoggedResults(prev => [newEntry, ...prev]);
      toast(
        <div className="flex items-center gap-3">
          <img src={dalmatianReward} alt="Got that dog in me" className="w-16 h-16 rounded-lg object-cover" />
          <span className="font-semibold text-sm">You got that dog in you! 🐾</span>
        </div>,
        { duration: 3000 }
      );
    } catch {
      toast.error('Failed to save. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const handleRxChoice = (rx: boolean) => {
    setIsRx(rx);
    if (needsInput) {
      setStep('input');
    } else {
      handleSubmit(rx, true);
    }
  };

  const autoFormatTime = (raw: string): string => {
    const digits = raw.replace(/\D/g, '').slice(0, 5);
    if (digits.length <= 2) return digits;
    return digits.slice(0, digits.length - 2) + ':' + digits.slice(digits.length - 2);
  };

  const validateTimeFormat = (t: string) => /^\d{1,3}:\d{2}$/.test(t);

  const validate = (): boolean => {
    setValidationError('');
    switch (resultType) {
      case 'time':
        if (!formData.time.trim()) { setValidationError('Time is required'); return false; }
        if (!validateTimeFormat(formData.time.trim())) { setValidationError('Enter a valid time'); return false; }
        return true;
      case 'rounds_reps': {
        const roundsNum = formData.rounds === '' ? NaN : parseInt(formData.rounds);
        const repsNum = formData.reps === '' ? 0 : parseInt(formData.reps);
        if (isNaN(roundsNum) && formData.reps === '') {
          setValidationError('Enter rounds or reps');
          return false;
        }
        if (totalRoundReps > 0 && repsNum >= totalRoundReps) {
          setValidationError('Remaining reps exceed one full round. Add another round instead.');
          return false;
        }
        return true;
      }
      case 'calories':
        if (formData.calories === '') { setValidationError('Enter calories'); return false; }
        return true;
      case 'meters':
        if (formData.meters === '') { setValidationError('Enter meters'); return false; }
        return true;
      case 'weight':
        if (formData.weight === '') { setValidationError('Enter weight'); return false; }
        return true;
      default:
        return true;
    }
  };

  const handleSubmit = async (rxOverride?: boolean, skipValidation?: boolean) => {
    if (!user || submittingRef.current) return;

    const rx = rxOverride !== undefined ? rxOverride : isRx;

    if (!skipValidation && !validate()) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    // Normalize completion_date to start-of-day for AMRAP (one score per day)
    const completionDate = (() => {
      if (resultType === 'rounds_reps') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return today.toISOString();
      }
      return new Date().toISOString();
    })();

    const payload: Record<string, any> = {
      user_id: user.id,
      workout_id: workoutId,
      workout_section_id: sectionId,
      result_type: resultType,
      is_rx: rx,
      completion_date: completionDate,
    };

    if (resultType === 'time' && formData.time) payload.time = formData.time.trim();
    if (resultType === 'rounds_reps') {
      payload.rounds = formData.rounds === '' ? 0 : Math.max(0, parseInt(formData.rounds));
      payload.reps = formData.reps === '' ? 0 : Math.max(0, parseInt(formData.reps));
      payload.exercise_name = null; // AMRAP is a section-level score
    }
    if (resultType === 'calories' && formData.calories !== '') payload.calories = Math.max(0, parseInt(formData.calories));
    if (resultType === 'meters' && formData.meters !== '') payload.meters = Math.max(0, parseInt(formData.meters));
    if (resultType === 'weight' && formData.weight !== '') payload.weight = Math.max(0, parseFloat(formData.weight));
    if (formData.notes) payload.notes = formData.notes;

    const newEntry: SectionLogEntry = {
      result_type: resultType,
      is_rx: rx,
      time: payload.time,
      rounds: payload.rounds,
      reps: payload.reps,
      calories: payload.calories,
      meters: payload.meters,
      weight: payload.weight,
      notes: payload.notes,
      completion_date: completionDate,
    };

    try {
      // Check-then-save: find an existing log for this user/section on this date
      const dayStart = new Date(completionDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data: existing, error: findErr } = await supabase
        .from('workout_logs')
        .select('id')
        .eq('user_id', user.id)
        .eq('workout_section_id', sectionId)
        .gte('completion_date', dayStart.toISOString())
        .lt('completion_date', dayEnd.toISOString())
        .limit(1)
        .maybeSingle();
      if (findErr) throw findErr;

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

      // Only update UI AFTER the database confirms a successful save
      setLoggedResults(prev => [newEntry, ...prev]);
      setOpen(false);
      toast(
        <div className="flex items-center gap-3">
          <img src={dalmatianReward} alt="Got that dog in me" className="w-16 h-16 rounded-lg object-cover" />
          <span className="font-semibold text-sm">You got that dog in you! 🐾</span>
        </div>,
        { duration: 3000 }
      );
    } catch (err: any) {
      setSubmitError('Failed to save. Check your connection and try again.');
      toast.error('Failed to save. Please check your connection and try again.');
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const latestLog = loggedResults[0];
  const loggedToday = latestLog?.completion_date
    ? new Date(latestLog.completion_date).toLocaleDateString() === new Date().toLocaleDateString()
    : false;

  return (
    <>
      {loggedToday ? (
        <div className="mt-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-body text-primary">
            <CheckCircle2 className="h-3.5 w-3.5" />
            <span className="font-semibold">{formatLogSummary(latestLog)}</span>
            <span className="text-muted-foreground">• {latestLog.is_rx ? 'Rx' : 'Scaled'}</span>
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
          LOG RESULT
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-sm bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-center text-sm tracking-widest text-muted-foreground">
              {sectionName.toUpperCase()}
            </DialogTitle>
          </DialogHeader>

          {/* Step 1: Rx / Scaled */}
          {step === 'rx' && (
            <>
              <p className="text-center text-lg font-bold tracking-widest mt-1">HOW DID YOU PERFORM?</p>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <button
                  onClick={() => handleRxChoice(true)}
                  disabled={submitting}
                  className="rounded-xl border-2 border-primary bg-primary/10 p-5 text-center hover:bg-primary/20 transition-colors disabled:opacity-50"
                >
                  <p className="text-lg font-bold text-primary">Rx</p>
                  <p className="text-xs text-muted-foreground mt-1 font-body">As Prescribed</p>
                </button>
                <button
                  onClick={() => handleRxChoice(false)}
                  disabled={submitting}
                  className="rounded-xl border-2 border-border bg-secondary p-5 text-center hover:border-muted-foreground transition-colors disabled:opacity-50"
                >
                  <p className="text-lg font-bold text-foreground">Scaled</p>
                  <p className="text-xs text-muted-foreground mt-1 font-body">Modified</p>
                </button>
              </div>
              {submitting && (
                <p className="text-xs text-muted-foreground text-center mt-2 font-body">Saving...</p>
              )}
              {submitError && (
                <p className="text-xs text-destructive font-body text-center font-semibold mt-2">{submitError}</p>
              )}
            </>
          )}

          {/* Step 2: Metric Input (only if not 'completed') */}
          {step === 'input' && (
            <>
              <p className="text-center text-sm font-bold tracking-widest mt-1">
                {RESULT_TYPE_LABELS[resultType].toUpperCase()}
                <span className="ml-2 text-xs font-normal text-muted-foreground">({isRx ? 'Rx' : 'Scaled'})</span>
              </p>
              <div className="mt-3 space-y-3">
                {resultType === 'time' && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Time (MM:SS)</label>
                    <Input
                      value={formData.time}
                      onChange={e => { setFormData(d => ({ ...d, time: autoFormatTime(e.target.value) })); setSubmitError(''); }}
                      className="bg-secondary"
                      placeholder="1245"
                      inputMode="numeric"
                    />
                  </div>
                )}
                {resultType === 'rounds_reps' && (
                  <>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Total Full Rounds</label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.rounds}
                          onChange={e => { setFormData(d => ({ ...d, rounds: e.target.value })); setSubmitError(''); setValidationError(''); }}
                          className="bg-secondary"
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </div>
                      <div>
                        <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Remaining Reps</label>
                        <Input
                          type="number"
                          min="0"
                          value={formData.reps}
                          onChange={e => { setFormData(d => ({ ...d, reps: e.target.value })); setSubmitError(''); setValidationError(''); }}
                          className="bg-secondary"
                          placeholder="0"
                          inputMode="numeric"
                        />
                      </div>
                    </div>
                    <p className="text-[10px] text-muted-foreground font-body italic">
                      Total reps completed into the next round (across all movements)
                      {totalRoundReps > 0 && ` — one full round = ${totalRoundReps} reps`}
                    </p>
                  </>
                )}
                {resultType === 'calories' && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Calories</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.calories}
                      onChange={e => { setFormData(d => ({ ...d, calories: e.target.value })); setSubmitError(''); }}
                      className="bg-secondary"
                      placeholder="0"
                    />
                  </div>
                )}
                {resultType === 'meters' && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Meters</label>
                    <Input
                      type="number"
                      min="0"
                      value={formData.meters}
                      onChange={e => { setFormData(d => ({ ...d, meters: e.target.value })); setSubmitError(''); }}
                      className="bg-secondary"
                      placeholder="0"
                    />
                  </div>
                )}
                {resultType === 'weight' && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Weight</label>
                    <Input
                      type="number"
                      min="0"
                      step="0.5"
                      value={formData.weight}
                      onChange={e => { setFormData(d => ({ ...d, weight: e.target.value })); setSubmitError(''); }}
                      className="bg-secondary"
                      placeholder="0"
                    />
                  </div>
                )}

                {/* Notes - always available, especially useful for Scaled */}
                <Textarea
                  value={formData.notes}
                  onChange={e => { setFormData(d => ({ ...d, notes: e.target.value })); setSubmitError(''); }}
                  placeholder={isRx ? 'Notes (optional)' : 'Scaling notes (optional)'}
                  className="bg-secondary"
                  rows={2}
                />

                {validationError && (
                  <p className="text-xs text-destructive font-body text-center">{validationError}</p>
                )}

                {submitError && (
                  <p className="text-xs text-destructive font-body text-center font-semibold">{submitError}</p>
                )}

                <Button
                  onClick={() => handleSubmit()}
                  disabled={submitting}
                  className="w-full gradient-fire text-primary-foreground font-display text-lg shadow-fire"
                >
                  {submitting ? 'SAVING...' : 'SUBMIT'}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
