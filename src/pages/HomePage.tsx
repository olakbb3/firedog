import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Flame, Trophy, Zap, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';

interface WorkoutRow {
  id: string;
  title: string;
  description: string;
  exercises: any[];
  coach_notes: string | null;
  date: string;
}

interface ProgramRow {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_weeks: number;
}

interface ChallengeRow {
  id: string;
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  participants: number;
}

interface ProfileRow {
  full_name: string | null;
  points: number;
}

const HomePage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth, isGuest } = useAuthGate();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [todayWorkout, setTodayWorkout] = useState<WorkoutRow | null>(null);
  const [featuredProgram, setFeaturedProgram] = useState<ProgramRow | null>(null);
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      const queries: Promise<any>[] = [
        supabase.from('workouts').select('*').order('date', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('programs').select('*').order('price', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('challenges').select('*'),
      ];

      if (user) {
        queries.unshift(
          supabase.from('profiles').select('full_name, points').eq('id', user.id).maybeSingle()
        );
        const [profileRes, workoutRes, programRes, challengeRes] = await Promise.all(queries);
        if (profileRes.data) setProfile(profileRes.data);
        if (workoutRes.data) setTodayWorkout(workoutRes.data);
        if (programRes.data) setFeaturedProgram(programRes.data);
        if (challengeRes.data) setChallenges(challengeRes.data);
      } else {
        const [workoutRes, programRes, challengeRes] = await Promise.all(queries);
        if (workoutRes.data) setTodayWorkout(workoutRes.data);
        if (programRes.data) setFeaturedProgram(programRes.data);
        if (challengeRes.data) setChallenges(challengeRes.data);
      }
    };

    fetchData();
  }, [user]);

  const displayName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Athlete';

  const handleStartWorkout = (workoutId: string) => {
    if (requireAuth('Start Workout')) {
      navigate(`/workout/${workoutId}`);
    }
  };

  const handleJoinChallenge = () => {
    requireAuth('Join Challenge');
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-muted-foreground">
            {isGuest ? 'Welcome to' : 'Welcome back,'}
          </p>
          <h1 className="text-xl font-bold">{isGuest ? 'FiredogWorks' : displayName}</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('https://firedogworks.store', '_blank')}
            className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
          >
            <ShoppingBag className="h-5 w-5" />
          </button>
          {!isGuest && (
            <div className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5">
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-sm font-semibold">{profile?.points ?? 0}</span>
            </div>
          )}
        </div>
      </div>

      {/* Guest CTA Banner */}
      {isGuest && (
        <button
          onClick={() => navigate('/onboarding')}
          className="w-full mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 text-left hover:bg-primary/10 transition-colors"
        >
          <p className="text-sm font-bold text-primary font-display">CREATE YOUR FREE ACCOUNT</p>
          <p className="text-xs text-muted-foreground mt-1">Save workouts, track progress, and join challenges.</p>
        </button>
      )}

      {/* Banner */}
      <div className="mb-6 rounded-xl gradient-fire p-6 shadow-fire">
        <h2 className="text-2xl font-bold text-primary-foreground">FORGE YOUR FIRE</h2>
        <p className="mt-1 text-sm text-primary-foreground/80">Your daily training awaits.</p>
      </div>

      {/* WOD */}
      {todayWorkout && (
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
              <span>{todayWorkout.exercises?.length ?? 0} exercises</span>
              <span>•</span>
              <span>{(todayWorkout.exercises || []).reduce((a: number, e: any) => a + (e.sets || 0), 0)} total sets</span>
            </div>
            <div className="mt-3">
              <span className="text-xs text-primary font-semibold">VIEW WORKOUT →</span>
            </div>
          </button>
        </div>
      )}

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
      {challenges.length > 0 && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3">🔥 ACTIVE CHALLENGES</h2>
          <div className="space-y-3">
            {challenges.map((ch) => (
              <div key={ch.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
                <h3 className="font-bold font-display text-sm">{ch.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{ch.description}</p>
                <div className="mt-2 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{ch.participants} athletes joined</span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs h-7 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                    onClick={handleJoinChallenge}
                  >
                    Join
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;
