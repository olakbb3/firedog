import { useState, useEffect, useRef } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
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

type ResultType = 'completed' | 'time' | 'rounds_reps' | 'calories' | 'meters' | 'weight';

interface SectionLogEntry {
  result_type: ResultType;
  is_rx: boolean;
  time?: string;
  rounds?: number;
  reps?: number;
  calories?: number;
  meters?: number;
  weight?: number;
  notes?: string;
}

interface Props {
  workoutId: string;
  sectionId: string;
  sectionName: string;
}

const RESULT_TYPE_LABELS: Record<ResultType, string> = {
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
      const parts: string[] = [];
      if (entry.rounds !== null && entry.rounds !== undefined) parts.push(`${entry.rounds} Rounds`);
      if (entry.reps !== null && entry.reps !== undefined) parts.push(`${entry.reps} Reps`);
      return parts.join(' + ') || 'Logged';
    }
    case 'calories': return (entry.calories !== null && entry.calories !== undefined) ? `${entry.calories} cal` : 'Logged';
    case 'meters': return (entry.meters !== null && entry.meters !== undefined) ? `${entry.meters} m` : 'Logged';
    case 'weight': return (entry.weight !== null && entry.weight !== undefined) ? `${entry.weight}` : 'Logged';
    default: return 'Logged';
  }
}

export default function SectionLogButton({ workoutId, sectionId, sectionName }: Props) {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const submittingRef = useRef(false);

  const [step, setStep] = useState<'rx' | 'type' | 'input'>('rx');
  const [open, setOpen] = useState(false);
  const [isRx, setIsRx] = useState(true);
  const [resultType, setResultType] = useState<ResultType>('completed');
  const [formData, setFormData] = useState({ time: '', rounds: '', reps: '', calories: '', meters: '', weight: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [submitError, setSubmitError] = useState('');

  const [loggedResults, setLoggedResults] = useState<SectionLogEntry[]>([]);

  useEffect(() => {
    if (!user || !sectionId) return;
    supabase
      .from('workout_logs')
      .select('result_type, is_rx, time, rounds, reps, calories, meters, weight, notes')
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
    setResultType('completed');
    setFormData({ time: '', rounds: '', reps: '', calories: '', meters: '', weight: '', notes: '' });
    setValidationError('');
    setSubmitError('');
  };

  const handleOpen = () => {
    if (!requireAuth('Log Result')) return;
    resetModal();
    setOpen(true);
  };

  const handleRxChoice = (rx: boolean) => {
    setIsRx(rx);
    setStep('type');
  };

  const handleTypeSelect = (type: ResultType) => {
    setResultType(type);
    if (type === 'completed') {
      handleSubmit(type, true);
    } else {
      setStep('input');
    }
  };

  const validateTimeFormat = (t: string) => /^\d{1,3}:\d{2}$/.test(t);

  const validate = (): boolean => {
    setValidationError('');
    switch (resultType) {
      case 'time':
        if (!formData.time.trim()) { setValidationError('Time is required'); return false; }
        if (!validateTimeFormat(formData.time.trim())) { setValidationError('Use MM:SS format'); return false; }
        return true;
      case 'rounds_reps':
        if (formData.rounds === '' && formData.reps === '') { setValidationError('Enter rounds or reps'); return false; }
        return true;
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

  const handleSubmit = async (overrideType?: ResultType, skipValidation?: boolean) => {
    if (!user || submittingRef.current) return;
    const rt = overrideType || resultType;

    if (!skipValidation && !validate()) return;

    submittingRef.current = true;
    setSubmitting(true);
    setSubmitError('');
    const payload: Record<string, any> = {
      user_id: user.id,
      workout_id: workoutId,
      workout_section_id: sectionId,
      result_type: rt,
      is_rx: isRx,
      completion_date: new Date().toISOString(),
    };

    if (rt === 'time' && formData.time) payload.time = formData.time.trim();
    if (rt === 'rounds_reps') {
      if (formData.rounds !== '') payload.rounds = Math.max(0, parseInt(formData.rounds));
      if (formData.reps !== '') payload.reps = Math.max(0, parseInt(formData.reps));
    }
    if (rt === 'calories' && formData.calories !== '') payload.calories = Math.max(0, parseInt(formData.calories));
    if (rt === 'meters' && formData.meters !== '') payload.meters = Math.max(0, parseInt(formData.meters));
    if (rt === 'weight' && formData.weight !== '') payload.weight = Math.max(0, parseFloat(formData.weight));
    if (formData.notes) payload.notes = formData.notes;

    const newEntry: SectionLogEntry = {
      result_type: rt,
      is_rx: isRx,
      time: payload.time,
      rounds: payload.rounds,
      reps: payload.reps,
      calories: payload.calories,
      meters: payload.meters,
      weight: payload.weight,
      notes: payload.notes,
    };

    try {
      const { error } = await supabase.from('workout_logs').insert(payload);
      if (error) throw error;
      // Success: update UI and close
      setLoggedResults(prev => [newEntry, ...prev]);
      setOpen(false);
    } catch (err: any) {
      setSubmitError('Failed to save. Check your connection and try again.');
      toast({
        title: 'Failed to save',
        description: 'Please check your connection and try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
      submittingRef.current = false;
    }
  };

  const latestLog = loggedResults[0];

  return (
    <>
      {latestLog ? (
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
                  className="rounded-xl border-2 border-primary bg-primary/10 p-5 text-center hover:bg-primary/20 transition-colors"
                >
                  <p className="text-lg font-bold text-primary">Rx</p>
                  <p className="text-xs text-muted-foreground mt-1 font-body">As Prescribed</p>
                </button>
                <button
                  onClick={() => handleRxChoice(false)}
                  className="rounded-xl border-2 border-border bg-secondary p-5 text-center hover:border-muted-foreground transition-colors"
                >
                  <p className="text-lg font-bold text-foreground">Scaled</p>
                  <p className="text-xs text-muted-foreground mt-1 font-body">Modified</p>
                </button>
              </div>
            </>
          )}

          {/* Step 2: Result Type */}
          {step === 'type' && (
            <>
              <p className="text-center text-lg font-bold tracking-widest mt-1">RESULT TYPE</p>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {(Object.keys(RESULT_TYPE_LABELS) as ResultType[]).map(rt => (
                  <button
                    key={rt}
                    onClick={() => handleTypeSelect(rt)}
                    className="rounded-lg border border-border bg-secondary p-3 text-center hover:border-primary hover:bg-primary/5 transition-colors"
                  >
                    <p className="text-sm font-semibold font-body">{RESULT_TYPE_LABELS[rt]}</p>
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Step 3: Conditional Input */}
          {step === 'input' && (
            <>
              <p className="text-center text-sm font-bold tracking-widest mt-1">
                {RESULT_TYPE_LABELS[resultType].toUpperCase()}
              </p>
              <div className="mt-3 space-y-3">
                {resultType === 'time' && (
                  <div>
                    <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Time (MM:SS)</label>
                    <Input
                      value={formData.time}
                      onChange={e => { setFormData(d => ({ ...d, time: e.target.value })); setSubmitError(''); }}
                      className="bg-secondary"
                      placeholder="12:45"
                    />
                  </div>
                )}
                {resultType === 'rounds_reps' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Rounds</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.rounds}
                        onChange={e => { setFormData(d => ({ ...d, rounds: e.target.value })); setSubmitError(''); }}
                        className="bg-secondary"
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground mb-1 block font-body uppercase tracking-wider">Reps</label>
                      <Input
                        type="number"
                        min="0"
                        value={formData.reps}
                        onChange={e => { setFormData(d => ({ ...d, reps: e.target.value })); setSubmitError(''); }}
                        className="bg-secondary"
                        placeholder="0"
                      />
                    </div>
                  </div>
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
                      onChange={e => setFormData(d => ({ ...d, weight: e.target.value }))}
                      className="bg-secondary"
                      placeholder="0"
                    />
                  </div>
                )}

                {/* Notes - only show for scaled or always optional */}
                <Textarea
                  value={formData.notes}
                  onChange={e => setFormData(d => ({ ...d, notes: e.target.value }))}
                  placeholder="Notes (optional)"
                  className="bg-secondary"
                  rows={2}
                />

                {validationError && (
                  <p className="text-xs text-destructive font-body text-center">{validationError}</p>
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
