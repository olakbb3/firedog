import { useNavigate } from 'react-router-dom';
import { Flame, ChevronRight, Trophy, Zap, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockWorkouts, mockPrograms, mockHomeContent, mockChallenges, mockUser } from '@/data/mockData';

const HomePage = () => {
  const navigate = useNavigate();
  const todayWorkout = mockWorkouts[0];
  const featuredProgram = mockPrograms.find(p => p.id === mockHomeContent.featured_program_id);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back,</p>
          <h1 className="text-xl font-bold">{mockUser.name.split(' ')[0]}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('https://firedogworks.store', '_blank')}
            className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5">
            <Flame className="h-4 w-4 text-primary" />
            <span className="text-sm font-semibold">{mockUser.points}</span>
          </div>
        </div>
      </div>

      {/* Motivational Quote */}
      {mockHomeContent.motivational_quote && (
        <div className="mb-6 rounded-xl bg-secondary p-4 border border-border">
          <p className="text-sm italic text-muted-foreground">{mockHomeContent.motivational_quote}</p>
        </div>
      )}

      {/* Banner */}
      <div className="mb-6 rounded-xl gradient-fire p-6 shadow-fire">
        <h2 className="text-2xl font-bold text-primary-foreground">{mockHomeContent.banner_text}</h2>
        <p className="mt-1 text-sm text-primary-foreground/80">Your daily training awaits.</p>
      </div>

      {/* WOD */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            WORKOUT OF THE DAY
          </h2>
        </div>
        <button
          onClick={() => navigate(`/workout/${todayWorkout.id}`)}
          className="w-full rounded-xl bg-card border border-border p-5 text-left shadow-card hover:border-primary/50 transition-colors"
        >
          <h3 className="text-lg font-bold font-display">{todayWorkout.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{todayWorkout.description}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>{todayWorkout.exercises.length} exercises</span>
            <span>•</span>
            <span>{todayWorkout.exercises.reduce((a, e) => a + (e.sets || 0), 0)} total sets</span>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-xs text-primary font-semibold">START WORKOUT →</span>
          </div>
        </button>
      </div>

      {/* Featured Program */}
      {featuredProgram && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5 text-accent" />
            FEATURED PROGRAM
          </h2>
          <button
            onClick={() => navigate('/programs')}
            className="w-full rounded-xl bg-card border border-border p-5 text-left shadow-card hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold font-display">{featuredProgram.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{featuredProgram.duration_weeks} weeks</p>
              </div>
              <div className="rounded-lg gradient-fire px-3 py-1.5">
                <span className="text-sm font-bold text-primary-foreground">${featuredProgram.price}</span>
              </div>
            </div>
          </button>
        </div>
      )}

      {/* Active Challenges */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">🔥 ACTIVE CHALLENGES</h2>
        <div className="space-y-3">
          {mockChallenges.map((ch) => (
            <div key={ch.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
              <h3 className="font-bold font-display text-sm">{ch.title}</h3>
              <p className="text-xs text-muted-foreground mt-1">{ch.description}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{ch.participants} athletes joined</span>
                <Button size="sm" variant="outline" className="text-xs h-7 border-primary text-primary hover:bg-primary hover:text-primary-foreground">
                  Join
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HomePage;
