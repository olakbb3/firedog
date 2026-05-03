import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { SectionResultType, SectionInputMode } from '@/types/index';

const RESULT_TYPE_OPTIONS: { value: SectionResultType; label: string }[] = [
  { value: 'completed', label: 'Just Completed' },
  { value: 'time', label: 'Time' },
  { value: 'rounds_reps', label: 'AMRAP / rounds+reps' },
  { value: 'calories', label: 'Calories' },
  { value: 'meters', label: 'Meters' },
  { value: 'weight', label: 'Weight' },
];

const INPUT_MODE_OPTIONS: { value: SectionInputMode; label: string }[] = [
  { value: 'single', label: 'Single Score' },
  { value: 'per_exercise', label: 'Per Exercise' },
];

interface SectionTemplate {
  section_name: string;
  result_type: SectionResultType;
  locked?: boolean;
}

const FIREDOG_TEMPLATE: SectionTemplate[] = [
  { section_name: 'Morning Meeting', result_type: 'completed', locked: true },
  { section_name: 'Dispatch', result_type: 'completed', locked: true },
  { section_name: 'First-In', result_type: 'rounds_reps', locked: true },
  { section_name: 'Overhaul', result_type: 'weight', locked: true },
  { section_name: 'Rehab', result_type: 'completed', locked: true },
];

const ENGINE_TEMPLATE: SectionTemplate[] = [
  { section_name: 'Warm-up', result_type: 'completed', locked: true },
  { section_name: 'Conditioning', result_type: 'time', locked: true },
];

interface WorkoutRow {
  id: string;
  title: string;
  description: string;
  workout_date: string | null;
  date: string;
}

interface ExerciseInput {
  exercise_name: string;
  sets: string;
  reps: string;
  duration: string;
  calories: string;
  meters: string;
  notes: string;
  scaling_notes: string;
}

interface SectionInput {
  id?: string;
  section_name: string;
  result_type: SectionResultType;
  input_mode: SectionInputMode;
  time_cap_minutes?: string;
  locked: boolean;
  exercises: ExerciseInput[];
  userOverrode?: boolean;
}

const emptyExercise = (): ExerciseInput => ({ exercise_name: '', sets: '', reps: '', duration: '', calories: '', meters: '', notes: '', scaling_notes: '' });

const autoDetectInputMode = (exerciseCount: number): SectionInputMode =>
  exerciseCount >= 2 ? 'per_exercise' : 'single';

const AdminProgramPage = () => {
  const { programId } = useParams<{ programId: string }>();
  const navigate = useNavigate();
  const { role } = useAuth();
  const { toast } = useToast();

  const [programTitle, setProgramTitle] = useState('');
  const [programSku, setProgramSku] = useState('');
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>(new Date());
  const [sections, setSections] = useState<SectionInput[]>([]);

  const isFiredog = programSku?.toLowerCase().includes('firedog') || programTitle?.toLowerCase().includes('firedog');
  const isEngine = programSku?.toLowerCase().includes('engine') || programTitle?.toLowerCase().includes('engine');
  const isStructuredProgram = isFiredog || isEngine;

  const getTemplate = (): SectionInput[] => {
    if (isFiredog) {
      return FIREDOG_TEMPLATE.map(t => ({ ...t, input_mode: 'single' as SectionInputMode, time_cap_minutes: '', locked: true, exercises: [emptyExercise()] }));
    }
    if (isEngine) {
      return ENGINE_TEMPLATE.map(t => ({ ...t, input_mode: 'single' as SectionInputMode, time_cap_minutes: '', locked: true, exercises: [emptyExercise()] }));
    }
    return [{ section_name: '', result_type: 'completed', input_mode: 'single' as SectionInputMode, time_cap_minutes: '', locked: false, exercises: [emptyExercise()] }];
  };

  useEffect(() => {
    if (!programId) return;
    const fetchProgram = async () => {
      const { data } = await supabase.from('programs').select('id, title, sku').eq('id', programId).maybeSingle();
      if (data) {
        setProgramTitle(data.title);
        setProgramSku(data.sku || '');
      }
    };
    fetchProgram();
  }, [programId]);

  const fetchWorkouts = async () => {
    if (!programId) return;
    const { data, error } = await supabase
      .from('workouts')
      .select('id, title, description, workout_date, date')
      .eq('program_id', programId)
      .order('workout_date', { ascending: false, nullsFirst: false });
    if (error) {
      toast({ title: 'Operation failed', description: error.message, variant: 'destructive' });
      return;
    }
    if (data) setWorkouts(data);
  };

  useEffect(() => { fetchWorkouts(); }, [programId]);

  const resetForm = () => {
    setFormTitle('');
    setFormDesc('');
    setFormDate(new Date());
    setEditingId(null);
    setSections(getTemplate());
  };

  const updateSectionResultType = (idx: number, rt: SectionResultType) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, result_type: rt } : s));
  };

  const addExercise = (sectionIdx: number) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      const exercises = [...s.exercises, emptyExercise()];
      const input_mode = s.userOverrode ? s.input_mode : autoDetectInputMode(exercises.length);
      return { ...s, exercises, input_mode };
    }));
  };

  const removeExercise = (sectionIdx: number, exIdx: number) => {
    setSections(prev => prev.map((s, i) => {
      if (i !== sectionIdx) return s;
      const exercises = s.exercises.filter((_, j) => j !== exIdx);
      if (exercises.length === 0) {
        return { ...s, exercises, userOverrode: false, input_mode: autoDetectInputMode(0) };
      }
      const input_mode = s.userOverrode ? s.input_mode : autoDetectInputMode(exercises.length);
      return { ...s, exercises, input_mode };
    }));
  };

  const updateExercise = (sectionIdx: number, exIdx: number, field: keyof ExerciseInput, value: string) => {
    setSections(prev => prev.map((s, si) =>
      si === sectionIdx
        ? { ...s, exercises: s.exercises.map((ex, ei) => ei === exIdx ? { ...ex, [field]: value } : ex) }
        : s
    ));
  };

  const handleEdit = async (workoutId: string) => {
    const w = workouts.find(x => x.id === workoutId);
    if (!w) return;

    setFormTitle(w.title);
    setFormDesc(w.description);
    setFormDate(new Date(w.workout_date + 'T00:00:00'));
    setEditingId(workoutId);

    const [sectionsRes, exercisesRes] = await Promise.all([
      supabase.from('workout_sections').select('*').eq('workout_id', workoutId).order('order_index'),
      supabase.from('exercises').select('*').eq('workout_id', workoutId).order('order_index'),
    ]);

    if (sectionsRes.error) {
      toast({ title: 'Save failed', description: sectionsRes.error.message, variant: 'destructive' });
      return;
    }
    if (exercisesRes.error) {
      toast({ title: 'Save failed', description: exercisesRes.error.message, variant: 'destructive' });
      return;
    }

    const dbSections = sectionsRes.data || [];
    const dbExercises = exercisesRes.data || [];

    if (dbSections.length > 0) {
      const template = getTemplate();
      setSections(dbSections.map(s => {
        const templateMatch = template.find(t => t.section_name === s.section_name);
        const exercises = dbExercises
          .filter((e: any) => e.section_id === s.id)
          .map((e: any) => ({
            exercise_name: e.exercise_name || '',
            sets: e.sets?.toString() || '',
            reps: e.reps?.toString() || '',
            duration: e.duration || '',
            calories: e.calories != null ? String(e.calories) : '',
            meters: e.meters != null ? String(e.meters) : '',
            notes: e.notes || '',
            scaling_notes: (e as any).scaling_notes || '',
          }));
        const savedMode = (s.input_mode as SectionInputMode) || 'single';
        const userOverrode = savedMode !== autoDetectInputMode(exercises.length);
        return {
          id: s.id,
          section_name: s.section_name,
          result_type: (s.result_type as SectionResultType) || 'completed',
          input_mode: savedMode,
          time_cap_minutes: (s as any).time_cap_minutes != null ? String((s as any).time_cap_minutes) : '',
          locked: templateMatch?.locked ?? false,
          exercises,
          userOverrode,
        };
      }).map(s => s.exercises.length === 0 ? { ...s, exercises: [emptyExercise()] } : s));
    } else {
      setSections(getTemplate());
    }

    setShowForm(true);
  };

  const handleSave = async () => {
    if (!formTitle.trim() || !programId) return;

    // Safety check: enforce section count for structured programs
    if (isFiredog && sections.length !== 5) {
      toast({ title: 'Firedog requires exactly 5 sections', variant: 'destructive' });
      return;
    }
    if (isEngine && sections.length !== 2) {
      toast({ title: 'Engine requires exactly 2 sections', variant: 'destructive' });
      return;
    }

    const workoutDate = formDate ? format(formDate, 'yyyy-MM-dd') : null;
    let workoutId = editingId;

    if (editingId) {
      // UPDATE workout metadata
      const { error } = await supabase.from('workouts').update({
        title: formTitle,
        description: formDesc,
        workout_date: workoutDate,
      }).eq('id', editingId);

      if (error) {
        toast({ title: 'Error updating workout', description: error.message, variant: 'destructive' });
        return;
      }

      // DELETE only exercises (safe — they have no external references)
      const { error: deleteExercisesError } = await supabase.from('exercises').delete().eq('workout_id', editingId);
      if (deleteExercisesError) {
        toast({ title: 'Save failed', description: deleteExercisesError.message, variant: 'destructive' });
        return;
      }

      // UPDATE or INSERT sections — never delete them
      const sectionMap: Record<number, string> = {};

      for (let i = 0; i < sections.length; i++) {
        const s = sections[i];
        const timeCap = s.time_cap_minutes && s.time_cap_minutes.trim() !== ''
          ? Math.max(0, parseInt(s.time_cap_minutes))
          : null;
        if (s.id) {
          // UPDATE existing section (preserve id)
          const updatePayload: any = { result_type: s.result_type || 'completed', input_mode: s.input_mode || 'single', time_cap_minutes: timeCap, order_index: i };
          if (!s.locked) {
            updatePayload.section_name = s.section_name;
          }
          const { error: secUpdateError } = await supabase.from('workout_sections').update(updatePayload).eq('id', s.id);
          if (secUpdateError) {
            toast({ title: 'Save failed', description: secUpdateError.message, variant: 'destructive' });
            return;
          }
          sectionMap[i] = s.id;
        } else {
          // INSERT new section
          const { data: inserted, error: secErr } = await supabase
            .from('workout_sections')
            .insert({
              workout_id: workoutId,
              section_name: s.section_name,
              result_type: s.result_type || 'completed',
              input_mode: s.input_mode || 'single',
              time_cap_minutes: timeCap,
              order_index: i,
            })
            .select()
            .single();

          if (secErr) {
            toast({ title: 'Save failed', description: secErr.message, variant: 'destructive' });
            return;
          }
          if (inserted) {
            sectionMap[i] = inserted.id;
          }
        }
      }

      // INSERT exercises with correct section_id
      const exerciseRows: any[] = [];
      sections.forEach((section, si) => {
        section.exercises
          .filter(ex => ex.exercise_name && String(ex.exercise_name).trim())
          .forEach((ex, ei) => {
            exerciseRows.push({
              workout_id: workoutId,
              section_id: sectionMap[si] || null,
              exercise_name: ex.exercise_name,
              sets: ex.sets && String(ex.sets).trim() !== '' ? parseInt(ex.sets) : null,
              reps: ex.reps && String(ex.reps).trim() !== '' ? parseInt(ex.reps) : null,
              duration: ex.duration ? String(ex.duration).trim() || null : null,
              calories: ex.calories && String(ex.calories).trim() !== '' ? parseInt(ex.calories) : null,
              meters: ex.meters && String(ex.meters).trim() !== '' ? parseInt(ex.meters) : null,
              notes: ex.notes ? String(ex.notes).trim() || null : null,
              scaling_notes: ex.scaling_notes ? ex.scaling_notes.trim() || null : null,
              order_index: ei,
            });
          });
      });

      if (exerciseRows.length > 0) {
        const { error: exerciseInsertError } = await supabase.from('exercises').insert(exerciseRows);
        if (exerciseInsertError) {
          toast({ title: 'Save failed', description: exerciseInsertError.message, variant: 'destructive' });
          return;
        }
      }
    } else {
      // CREATE new workout
      const { data: workout, error } = await supabase
        .from('workouts')
        .insert({
          title: formTitle,
          description: formDesc,
          exercises: [],
          workout_date: workoutDate,
          program_id: programId,
        })
        .select()
        .single();

      if (error || !workout) {
        toast({ title: 'Error creating workout', description: error?.message, variant: 'destructive' });
        return;
      }
      workoutId = workout.id;

      // Insert sections
      const sectionRows = sections
        .filter(s => s.section_name.trim())
        .map((s, i) => ({
          workout_id: workoutId,
          section_name: s.section_name,
          result_type: s.result_type || 'completed',
          input_mode: s.input_mode || 'single',
          time_cap_minutes: s.time_cap_minutes && s.time_cap_minutes.trim() !== ''
            ? Math.max(0, parseInt(s.time_cap_minutes))
            : null,
          order_index: i,
        }));

      let sectionMap: Record<number, string> = {};

      if (sectionRows.length > 0) {
        const { data: insertedSections, error: secError } = await supabase
          .from('workout_sections')
          .insert(sectionRows)
          .select();

        if (secError) {
          toast({ title: 'Save failed', description: secError.message, variant: 'destructive' });
          return;
        }

        if (insertedSections) {
          insertedSections.forEach((s, i) => { sectionMap[i] = s.id; });
        }
      }

      // Insert exercises
      const exerciseRows: any[] = [];
      sections.forEach((section, si) => {
        section.exercises
          .filter(ex => ex.exercise_name && String(ex.exercise_name).trim())
          .forEach((ex, ei) => {
            exerciseRows.push({
              workout_id: workoutId,
              section_id: sectionMap[si] || null,
              exercise_name: ex.exercise_name,
              sets: ex.sets && String(ex.sets).trim() !== '' ? parseInt(ex.sets) : null,
              reps: ex.reps && String(ex.reps).trim() !== '' ? parseInt(ex.reps) : null,
              duration: ex.duration ? String(ex.duration).trim() || null : null,
              calories: ex.calories && String(ex.calories).trim() !== '' ? parseInt(ex.calories) : null,
              meters: ex.meters && String(ex.meters).trim() !== '' ? parseInt(ex.meters) : null,
              notes: ex.notes ? String(ex.notes).trim() || null : null,
              scaling_notes: ex.scaling_notes ? ex.scaling_notes.trim() || null : null,
              order_index: ei,
            });
          });
      });

      if (exerciseRows.length > 0) {
        const { error: exerciseInsertError } = await supabase.from('exercises').insert(exerciseRows);
        if (exerciseInsertError) {
          toast({ title: 'Save failed', description: exerciseInsertError.message, variant: 'destructive' });
          return;
        }
      }
    }

    toast({ title: editingId ? 'Workout updated!' : 'Workout created!' });
    setShowForm(false);
    resetForm();
    fetchWorkouts();
  };

  if (role !== 'admin') return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/admin')} className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-bold font-display">{programTitle || 'PROGRAM'}</h1>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold font-display text-sm text-muted-foreground">
            {workouts.length} WORKOUT{workouts.length !== 1 ? 'S' : ''}
          </h2>
          <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire" onClick={() => {
            if (showForm) { setShowForm(false); resetForm(); } else { resetForm(); setShowForm(true); }
          }}>
            {showForm ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><Plus className="h-4 w-4 mr-1" /> Add Workout</>}
          </Button>
        </div>

        {showForm && (
          <div className="rounded-xl bg-card border border-border p-5 mb-6 shadow-card space-y-4">
            <Input placeholder="Workout Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="bg-secondary" />
            <Textarea placeholder="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="bg-secondary" rows={2} />

            <div>
              <label className="text-xs text-muted-foreground mb-1 block font-display">WORKOUT DATE</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !formDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formDate ? format(formDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={formDate} onSelect={setFormDate} initialFocus className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>

            {/* Sections */}
            <div>
              <p className="text-xs text-muted-foreground font-display mb-2">SECTIONS</p>
              {sections.map((section, si) => (
                <div key={section.id || si} className="mb-4 rounded-lg border border-border bg-secondary/50 p-3">
                  <div className="flex items-center gap-2 mb-2">
                    {section.locked ? (
                      <span className="bg-background text-sm font-bold flex-1 px-3 py-2 rounded-md border border-input text-muted-foreground">
                        {section.section_name}
                      </span>
                    ) : (
                      <Input
                        placeholder="Section name"
                        value={section.section_name}
                        onChange={e => setSections(prev => prev.map((s, i) => i === si ? { ...s, section_name: e.target.value } : s))}
                        className="bg-background text-sm font-bold flex-1"
                      />
                    )}
                  </div>

                  <div className="mb-2 grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1 block">Result Type</label>
                      <Select value={section.result_type} onValueChange={(v) => updateSectionResultType(si, v as SectionResultType)}>
                        <SelectTrigger className="bg-background text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RESULT_TYPE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider block">Input Mode</label>
                        {section.userOverrode && (
                          <span className="text-[9px] text-amber-500 font-medium">🔒 Manual override</span>
                        )}
                      </div>
                      <Select value={section.input_mode} onValueChange={(v) => setSections(prev => prev.map((s, i) => i === si ? { ...s, input_mode: v as SectionInputMode, userOverrode: true } : s))}>
                        <SelectTrigger className="bg-background text-xs h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {INPUT_MODE_OPTIONS.map(opt => (
                            <SelectItem key={opt.value} value={opt.value} className="text-xs">{opt.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Optional Time Cap (minutes) */}
                  <div className="mb-2">
                    <label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1 block">Time Cap (min, optional)</label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="—"
                      value={section.time_cap_minutes || ''}
                      onChange={e => setSections(prev => prev.map((s, i) => i === si ? { ...s, time_cap_minutes: e.target.value } : s))}
                      className="bg-background text-xs h-8 max-w-[120px]"
                    />
                  </div>

                  {section.exercises.map((ex, ei) => (
                    <div key={ei} className="mb-3 p-2 rounded-md bg-background/40 border border-border/60 space-y-1.5">
                      <div className="flex items-start gap-1.5">
                        <Input placeholder="Exercise name" value={ex.exercise_name} onChange={e => updateExercise(si, ei, 'exercise_name', e.target.value)} className="bg-background text-xs flex-1" />
                        <button onClick={() => removeExercise(si, ei)} className="p-2 text-destructive hover:bg-destructive/10 rounded shrink-0">
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-1.5">
                        <Input placeholder="Sets" type="number" min="0" value={ex.sets} onChange={e => updateExercise(si, ei, 'sets', e.target.value)} className="bg-background text-xs" />
                        <Input placeholder="Reps" type="number" min="0" value={ex.reps} onChange={e => updateExercise(si, ei, 'reps', e.target.value)} className="bg-background text-xs" />
                        <Input placeholder="Time" value={ex.duration} onChange={e => updateExercise(si, ei, 'duration', e.target.value)} className="bg-background text-xs" />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <Input placeholder="Cals" type="number" min="0" value={ex.calories} onChange={e => updateExercise(si, ei, 'calories', e.target.value)} className="bg-background text-xs" />
                        <Input placeholder="Meters" type="number" min="0" value={ex.meters} onChange={e => updateExercise(si, ei, 'meters', e.target.value)} className="bg-background text-xs" />
                      </div>
                      <Input placeholder="Coach note" value={ex.notes} onChange={e => updateExercise(si, ei, 'notes', e.target.value)} className="bg-background text-xs" />
                      <Textarea
                        placeholder="e.g. Sub ring rows for pull-ups, reduce weight by 50%"
                        value={ex.scaling_notes}
                        onChange={e => updateExercise(si, ei, 'scaling_notes', e.target.value)}
                        className="bg-background text-xs"
                        rows={3}
                      />
                    </div>
                  ))}
                  <Button variant="ghost" size="sm" onClick={() => addExercise(si)} className="text-xs h-6 text-muted-foreground">
                    <Plus className="h-3 w-3 mr-1" /> Exercise
                  </Button>
                </div>
              ))}

              {/* Only allow adding sections for non-structured programs */}
              {!isStructuredProgram && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSections(prev => [...prev, { section_name: '', result_type: 'completed', input_mode: 'single' as SectionInputMode, time_cap_minutes: '', locked: false, exercises: [emptyExercise()] }])}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" /> Add Section
                </Button>
              )}
            </div>

            <Button onClick={handleSave} className="w-full gradient-fire text-primary-foreground shadow-fire">
              <Save className="h-4 w-4 mr-2" /> {editingId ? 'UPDATE WORKOUT' : 'SAVE WORKOUT'}
            </Button>
          </div>
        )}

        <div className="space-y-3">
          {workouts.map((w) => (
            <div key={w.id} className="rounded-xl bg-card border border-border p-4 shadow-card flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display text-sm">{w.title}</h3>
                <p className="text-xs text-muted-foreground">{w.workout_date}</p>
              </div>
              <button onClick={() => handleEdit(w.id)} className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
                <Edit className="h-4 w-4" />
              </button>
            </div>
          ))}
          {workouts.length === 0 && !showForm && (
            <div className="rounded-xl bg-card border border-border p-8 text-center shadow-card">
              <p className="text-sm text-muted-foreground">No workouts yet. Tap "+ Add Workout" to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminProgramPage;
