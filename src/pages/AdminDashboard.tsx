import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Dumbbell, BookOpen, Image, Home, Trophy, X, Save, GripVertical, CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Tab = 'workouts' | 'programs' | 'challenges' | 'media' | 'home';

interface WorkoutRow { id: string; title: string; description: string; exercises: any[]; date: string; workout_date: string | null; }
interface ProgramRow { id: string; title: string; description: string; price: number; duration_weeks: number; }
interface ChallengeRow { id: string; title: string; description: string; participants: number; }

const DEFAULT_SECTIONS = ['Morning Meeting', 'Dispatch', 'First-In', 'Overhaul', 'Rehab'];

interface SectionInput {
  section_name: string;
  exercises: ExerciseInput[];
}

interface ExerciseInput {
  exercise_name: string;
  sets: string;
  reps: string;
  duration: string;
  notes: string;
}

const emptyExercise = (): ExerciseInput => ({ exercise_name: '', sets: '', reps: '', duration: '', notes: '' });

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('workouts');

  if (role !== 'admin') return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'programs', label: 'Programs', icon: BookOpen },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'home', label: 'Home', icon: Home },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold font-display">ADMIN DASHBOARD</h1>
          </div>
        </div>
      </div>

      <div className="border-b border-border overflow-x-auto">
        <div className="max-w-4xl mx-auto flex">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === 'workouts' && <WorkoutsTab />}
        {activeTab === 'programs' && <ProgramsTab />}
        {activeTab === 'challenges' && <ChallengesTab />}
        {activeTab === 'media' && <MediaTab />}
        {activeTab === 'home' && <HomeTab />}
      </div>
    </div>
  );
};

const WorkoutsTab = () => {
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formDate, setFormDate] = useState<Date | undefined>(new Date());
  const [sections, setSections] = useState<SectionInput[]>(
    DEFAULT_SECTIONS.map(name => ({ section_name: name, exercises: [emptyExercise()] }))
  );

  useEffect(() => {
    supabase.from('workouts').select('*').order('workout_date', { ascending: false, nullsFirst: false }).then(({ data }) => {
      if (data) setWorkouts(data);
    });
  }, []);

  const addSection = () => {
    setSections(prev => [...prev, { section_name: '', exercises: [emptyExercise()] }]);
  };

  const removeSection = (idx: number) => {
    setSections(prev => prev.filter((_, i) => i !== idx));
  };

  const updateSectionName = (idx: number, name: string) => {
    setSections(prev => prev.map((s, i) => i === idx ? { ...s, section_name: name } : s));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    setSections(prev => {
      const arr = [...prev];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const addExercise = (sectionIdx: number) => {
    setSections(prev => prev.map((s, i) => i === sectionIdx ? { ...s, exercises: [...s.exercises, emptyExercise()] } : s));
  };

  const removeExercise = (sectionIdx: number, exIdx: number) => {
    setSections(prev => prev.map((s, i) => i === sectionIdx ? { ...s, exercises: s.exercises.filter((_, j) => j !== exIdx) } : s));
  };

  const updateExercise = (sectionIdx: number, exIdx: number, field: keyof ExerciseInput, value: string) => {
    setSections(prev => prev.map((s, si) =>
      si === sectionIdx
        ? { ...s, exercises: s.exercises.map((ex, ei) => ei === exIdx ? { ...ex, [field]: value } : ex) }
        : s
    ));
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;
    const workoutDate = formDate ? format(formDate, 'yyyy-MM-dd') : null;

    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({
        title: formTitle,
        description: formDesc,
        exercises: [],
        date: new Date().toISOString().split('T')[0],
        workout_date: workoutDate,
      })
      .select()
      .single();

    if (error || !workout) {
      toast({ title: 'Error creating workout', description: error?.message, variant: 'destructive' });
      return;
    }

    // Insert sections
    const sectionRows = sections
      .filter(s => s.section_name.trim())
      .map((s, i) => ({
        workout_id: workout.id,
        section_name: s.section_name,
        order_index: i,
      }));

    let sectionMap: Record<number, string> = {};

    if (sectionRows.length > 0) {
      const { data: insertedSections, error: secError } = await supabase
        .from('workout_sections')
        .insert(sectionRows)
        .select();

      if (secError) {
        toast({ title: 'Error creating sections', description: secError.message, variant: 'destructive' });
      }

      if (insertedSections) {
        insertedSections.forEach((s, i) => {
          sectionMap[i] = s.id;
        });
      }
    }

    // Insert exercises
    const exerciseRows: any[] = [];
    sections.forEach((section, si) => {
      section.exercises
        .filter(ex => ex.exercise_name.trim())
        .forEach((ex, ei) => {
          exerciseRows.push({
            workout_id: workout.id,
            section_id: sectionMap[si] || null,
            exercise_name: ex.exercise_name,
            sets: ex.sets ? parseInt(ex.sets) : null,
            reps: ex.reps ? parseInt(ex.reps) : null,
            duration: ex.duration || null,
            notes: ex.notes || null,
            order_index: ei,
          });
        });
    });

    if (exerciseRows.length > 0) {
      await supabase.from('exercises').insert(exerciseRows);
    }

    toast({ title: 'Workout created!' });
    setShowForm(false);
    setFormTitle('');
    setFormDesc('');
    setFormDate(new Date());
    setSections(DEFAULT_SECTIONS.map(name => ({ section_name: name, exercises: [emptyExercise()] })));
    const { data } = await supabase.from('workouts').select('*').order('workout_date', { ascending: false, nullsFirst: false });
    if (data) setWorkouts(data);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold font-display">MANAGE WORKOUTS</h2>
        <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire" onClick={() => setShowForm(!showForm)}>
          {showForm ? <><X className="h-4 w-4 mr-1" /> Cancel</> : <><Plus className="h-4 w-4 mr-1" /> Add Workout</>}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-6 shadow-card space-y-4">
          <Input placeholder="Workout Title" value={formTitle} onChange={e => setFormTitle(e.target.value)} className="bg-secondary" />
          <Textarea placeholder="Description" value={formDesc} onChange={e => setFormDesc(e.target.value)} className="bg-secondary" rows={2} />

          {/* Date Picker */}
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
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-display">SECTIONS</p>
              <Button variant="outline" size="sm" onClick={addSection} className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Add Section
              </Button>
            </div>

            {sections.map((section, si) => (
              <div key={si} className="mb-4 rounded-lg border border-border bg-secondary/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex flex-col gap-0.5">
                    <button onClick={() => moveSection(si, -1)} className="text-muted-foreground hover:text-foreground text-xs" disabled={si === 0}>▲</button>
                    <button onClick={() => moveSection(si, 1)} className="text-muted-foreground hover:text-foreground text-xs" disabled={si === sections.length - 1}>▼</button>
                  </div>
                  <Input
                    placeholder="Section name"
                    value={section.section_name}
                    onChange={e => updateSectionName(si, e.target.value)}
                    className="bg-background text-sm font-bold flex-1"
                  />
                  <button onClick={() => removeSection(si)} className="text-destructive hover:bg-destructive/10 p-1 rounded">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {section.exercises.map((ex, ei) => (
                  <div key={ei} className="grid grid-cols-12 gap-1.5 mb-1.5 items-start">
                    <Input placeholder="Exercise" value={ex.exercise_name} onChange={e => updateExercise(si, ei, 'exercise_name', e.target.value)} className="col-span-3 bg-background text-xs" />
                    <Input placeholder="Sets" value={ex.sets} onChange={e => updateExercise(si, ei, 'sets', e.target.value)} className="col-span-1 bg-background text-xs" />
                    <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(si, ei, 'reps', e.target.value)} className="col-span-1 bg-background text-xs" />
                    <Input placeholder="Duration" value={ex.duration} onChange={e => updateExercise(si, ei, 'duration', e.target.value)} className="col-span-2 bg-background text-xs" />
                    <Input placeholder="Coach note" value={ex.notes} onChange={e => updateExercise(si, ei, 'notes', e.target.value)} className="col-span-4 bg-background text-xs" />
                    <button onClick={() => removeExercise(si, ei)} className="col-span-1 p-2 text-destructive hover:bg-destructive/10 rounded">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={() => addExercise(si)} className="text-xs h-6 text-muted-foreground">
                  <Plus className="h-3 w-3 mr-1" /> Exercise
                </Button>
              </div>
            ))}
          </div>

          <Button onClick={handleSave} className="w-full gradient-fire text-primary-foreground shadow-fire">
            <Save className="h-4 w-4 mr-2" /> SAVE WORKOUT
          </Button>
        </div>
      )}

      <div className="space-y-3">
        {workouts.map((w) => (
          <div key={w.id} className="rounded-xl bg-card border border-border p-4 shadow-card flex items-center justify-between">
            <div>
              <h3 className="font-bold font-display text-sm">{w.title}</h3>
              <p className="text-xs text-muted-foreground">{w.workout_date || w.date}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
                <Edit className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-lg bg-secondary text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgramsTab = () => {
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  useEffect(() => {
    supabase.from('programs').select('*').then(({ data }) => { if (data) setPrograms(data); });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold font-display">MANAGE PROGRAMS</h2>
        <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire">
          <Plus className="h-4 w-4 mr-1" /> Add Program
        </Button>
      </div>
      <div className="space-y-3">
        {programs.map((p) => (
          <div key={p.id} className="rounded-xl bg-card border border-border p-4 shadow-card flex items-center justify-between">
            <div>
              <h3 className="font-bold font-display text-sm">{p.title}</h3>
              <p className="text-xs text-muted-foreground">{p.duration_weeks} weeks • {p.price > 0 ? `$${p.price}` : 'Free'}</p>
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground">
                <Edit className="h-4 w-4" />
              </button>
              <button className="p-2 rounded-lg bg-secondary text-destructive hover:bg-destructive/10">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChallengesTab = () => {
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  useEffect(() => {
    supabase.from('challenges').select('*').then(({ data }) => { if (data) setChallenges(data); });
  }, []);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold font-display">MANAGE CHALLENGES</h2>
        <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire">
          <Plus className="h-4 w-4 mr-1" /> Add Challenge
        </Button>
      </div>
      <div className="space-y-3">
        {challenges.map((c) => (
          <div key={c.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
            <h3 className="font-bold font-display text-sm">{c.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
            <p className="text-xs text-muted-foreground mt-2">{c.participants} participants</p>
          </div>
        ))}
      </div>
    </div>
  );
};

const MediaTab = () => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold font-display">MEDIA LIBRARY</h2>
      <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire">
        <Plus className="h-4 w-4 mr-1" /> Upload
      </Button>
    </div>
    <div className="rounded-xl bg-card border border-border p-8 text-center shadow-card">
      <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">No media assets yet.</p>
    </div>
  </div>
);

const HomeTab = () => {
  const [workouts, setWorkouts] = useState<{ id: string; title: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [w, p] = await Promise.all([
        supabase.from('workouts').select('id, title'),
        supabase.from('programs').select('id, title'),
      ]);
      if (w.data) setWorkouts(w.data);
      if (p.data) setPrograms(p.data);
    };
    fetch();
  }, []);

  return (
    <div>
      <h2 className="font-bold font-display mb-4">HOME SCREEN CONTENT</h2>
      <div className="space-y-4">
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="text-xs text-muted-foreground mb-2 block">Banner Text</label>
          <Input defaultValue="FORGE YOUR FIRE" className="bg-secondary" />
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="text-xs text-muted-foreground mb-2 block">Motivational Quote</label>
          <Textarea defaultValue='"The fire inside you burns brighter than the fire around you." — Unknown' className="bg-secondary" rows={2} />
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="text-xs text-muted-foreground mb-2 block">Featured Workout</label>
          <select className="w-full rounded-lg bg-secondary border border-border p-2 text-sm text-foreground">
            {workouts.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
          </select>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="text-xs text-muted-foreground mb-2 block">Featured Program</label>
          <select className="w-full rounded-lg bg-secondary border border-border p-2 text-sm text-foreground">
            {programs.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
        </div>
        <Button className="w-full gradient-fire text-primary-foreground font-display shadow-fire">
          SAVE CHANGES
        </Button>
      </div>
    </div>
  );
};

export default AdminDashboard;
