import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, Dumbbell, BookOpen, Image, Home, Trophy, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { mockWorkouts, mockPrograms, mockChallenges } from '@/data/mockData';

type Tab = 'workouts' | 'programs' | 'challenges' | 'media' | 'home';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('workouts');

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: 'workouts', label: 'Workouts', icon: Dumbbell },
    { id: 'programs', label: 'Programs', icon: BookOpen },
    { id: 'challenges', label: 'Challenges', icon: Trophy },
    { id: 'media', label: 'Media', icon: Image },
    { id: 'home', label: 'Home', icon: Home },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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

      {/* Tabs */}
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

const WorkoutsTab = () => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold font-display">MANAGE WORKOUTS</h2>
      <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire">
        <Plus className="h-4 w-4 mr-1" /> Add Workout
      </Button>
    </div>
    <div className="space-y-3">
      {mockWorkouts.map((w) => (
        <div key={w.id} className="rounded-xl bg-card border border-border p-4 shadow-card flex items-center justify-between">
          <div>
            <h3 className="font-bold font-display text-sm">{w.title}</h3>
            <p className="text-xs text-muted-foreground">{w.exercises.length} exercises • {w.date}</p>
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

const ProgramsTab = () => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold font-display">MANAGE PROGRAMS</h2>
      <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire">
        <Plus className="h-4 w-4 mr-1" /> Add Program
      </Button>
    </div>
    <div className="space-y-3">
      {mockPrograms.map((p) => (
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

const ChallengesTab = () => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold font-display">MANAGE CHALLENGES</h2>
      <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire">
        <Plus className="h-4 w-4 mr-1" /> Add Challenge
      </Button>
    </div>
    <div className="space-y-3">
      {mockChallenges.map((c) => (
        <div key={c.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
          <h3 className="font-bold font-display text-sm">{c.title}</h3>
          <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
          <p className="text-xs text-muted-foreground mt-2">{c.participants} participants</p>
        </div>
      ))}
    </div>
  </div>
);

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
      <p className="text-sm text-muted-foreground">No media assets yet. Upload images and videos to use across the platform.</p>
    </div>
  </div>
);

const HomeTab = () => (
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
          {mockWorkouts.map(w => <option key={w.id} value={w.id}>{w.title}</option>)}
        </select>
      </div>
      <div className="rounded-xl bg-card border border-border p-4 shadow-card">
        <label className="text-xs text-muted-foreground mb-2 block">Featured Program</label>
        <select className="w-full rounded-lg bg-secondary border border-border p-2 text-sm text-foreground">
          {mockPrograms.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
        </select>
      </div>
      <Button className="w-full gradient-fire text-primary-foreground font-display shadow-fire">
        SAVE CHANGES
      </Button>
    </div>
  </div>
);

export default AdminDashboard;
