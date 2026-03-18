import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Dumbbell, BookOpen, Image, Home, Trophy, X, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';

type Tab = 'workouts' | 'programs' | 'challenges' | 'media' | 'home';

interface WorkoutRow { id: string; title: string; description: string; exercises: any[]; date: string; }
interface ProgramRow { id: string; title: string; description: string; price: number; duration_weeks: number; }
interface ChallengeRow { id: string; title: string; description: string; participants: number; }
interface ExerciseInput { exercise_name: string; sets: string; reps: string; duration: string; notes: string; }

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('workouts');

  // Extra safety check — AdminRoute already guards, but double-check
  if (role !== 'admin') {
    return null;
  }

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
                activeTab === id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
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
  const [formExercises, setFormExercises] = useState<ExerciseInput[]>([
    { exercise_name: '', sets: '', reps: '', duration: '', notes: '' },
  ]);

  useEffect(() => {
    supabase.from('workouts').select('*').order('date', { ascending: false }).then(({ data }) => {
      if (data) setWorkouts(data);
    });
  }, []);

  const addExerciseRow = () => {
    setFormExercises(prev => [...prev, { exercise_name: '', sets: '', reps: '', duration: '', notes: '' }]);
  };

  const updateExercise = (idx: number, field: keyof ExerciseInput, value: string) => {
    setFormExercises(prev => prev.map((ex, i) => i === idx ? { ...ex, [field]: value } : ex));
  };

  const removeExercise = (idx: number) => {
    setFormExercises(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSave = async () => {
    if (!formTitle.trim()) return;

    const { data: workout, error } = await supabase
      .from('workouts')
      .insert({ title: formTitle, description: formDesc, exercises: [], date: new Date().toISOString().split('T')[0] })
      .select()
      .single();

    if (error || !workout) {
      toast({ title: 'Error creating workout', description: error?.message, variant: 'destructive' });
      return;
    }

    // Insert exercises
    const exerciseRows = formExercises
      .filter(ex => ex.exercise_name.trim())
      .map(ex => ({
        workout_id: workout.id,
        exercise_name: ex.exercise_name,
        sets: ex.sets ? parseInt(ex.sets) : null,
        reps: ex.reps ? parseInt(ex.reps) : null,
        duration: ex.duration || null,
        notes: ex.notes || null,
      }));

    if (exerciseRows.length > 0) {
      await supabase.from('exercises').insert(exerciseRows);
    }

    toast({ title: 'Workout created!' });
    setShowForm(false);
    setFormTitle('');
    setFormDesc('');
    setFormExercises([{ exercise_name: '', sets: '', reps: '', duration: '', notes: '' }]);
    // Refresh
    const { data } = await supabase.from('workouts').select('*').order('date', { ascending: false });
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

          <div>
            <p className="text-xs text-muted-foreground mb-2 font-display">EXERCISES</p>
            {formExercises.map((ex, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 mb-2 items-start">
                <Input placeholder="Exercise name" value={ex.exercise_name} onChange={e => updateExercise(i, 'exercise_name', e.target.value)} className="col-span-3 bg-secondary text-xs" />
                <Input placeholder="Sets" value={ex.sets} onChange={e => updateExercise(i, 'sets', e.target.value)} className="col-span-1 bg-secondary text-xs" />
                <Input placeholder="Reps" value={ex.reps} onChange={e => updateExercise(i, 'reps', e.target.value)} className="col-span-1 bg-secondary text-xs" />
                <Input placeholder="Duration" value={ex.duration} onChange={e => updateExercise(i, 'duration', e.target.value)} className="col-span-2 bg-secondary text-xs" />
                <Input placeholder="Coach note" value={ex.notes} onChange={e => updateExercise(i, 'notes', e.target.value)} className="col-span-4 bg-secondary text-xs" />
                <button onClick={() => removeExercise(i)} className="col-span-1 p-2 text-destructive hover:bg-destructive/10 rounded">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addExerciseRow} className="text-xs">
              <Plus className="h-3 w-3 mr-1" /> Add Exercise
            </Button>
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
              <p className="text-xs text-muted-foreground">{w.date}</p>
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
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [programs, setPrograms] = useState<ProgramRow[]>([]);

  useEffect(() => {
    Promise.all([
      supabase.from('workouts').select('id, title').then(r => r.data || []),
      supabase.from('programs').select('id, title').then(r => r.data || []),
    ]).then(([w, p]) => { setWorkouts(w); setPrograms(p); });
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
