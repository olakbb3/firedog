// v2 — cache bust
import { useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Flame, Zap, ShoppingBag, Instagram } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';
import WeeklyDateStrip from '@/components/WeeklyDateStrip';
import NewMonthBanner from '@/components/NewMonthBanner';
import { format, isSameDay } from 'date-fns';
import firedogLogo from '@/assets/firedog-logo.png';
import philosophyImage from '@/assets/100-words.jpeg';
import inferno45Cover from '@/assets/inferno-45-cover.jpg';
import stationStrengthCover from '@/assets/station-strength-cover.jpg';

interface WorkoutRow {
  id: string;
  title: string;
  description: string;
  exercises: any[];
  coach_notes: string | null;
  date: string;
  workout_date: string | null;
}

interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
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
  const [allWorkouts, setAllWorkouts] = useState<WorkoutRow[]>([]);
  const [activeFiredogChallenge, setActiveFiredogChallenge] = useState<ChallengeRow | null>(null);
  const [loading, setLoading] = useState(true);
  
  
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const todayLocal = new Date().toLocaleDateString('en-CA');
      const [workoutsRes, challengeRes, profileRes] = await Promise.all([
        supabase.from('workouts').select('*').order('workout_date', { ascending: false }),
        supabase
          .from('challenges')
          .select('id, title, description, start_date, end_date')
          .eq('title', 'FIREDOG TOTAL')
          .eq('is_hidden', false)
          .lte('start_date', todayLocal)
          .gte('end_date', todayLocal)
          .order('start_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
        user
          ? supabase.from('profiles').select('full_name, points').eq('id', user.id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);

      if (workoutsRes.data) setAllWorkouts(workoutsRes.data);
      setActiveFiredogChallenge((challengeRes.data as ChallengeRow | null) || null);
      if (profileRes.data) setProfile(profileRes.data as ProfileRow);
      setLoading(false);
    };

    fetchData();
  }, [user]);

  // Filter workout for selected date (exclude Firedog Total from daily WOD)
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const todayWorkout = allWorkouts.find(w => {
    if (w.title?.toUpperCase() === 'FIREDOG TOTAL') return false;
    return w.workout_date === dateStr;
  });

  // Fallback: if no workout for selected date but it's today, show latest (excluding Firedog Total)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isSelectedToday = isSameDay(selectedDate, today);
  const latestWod = allWorkouts.find(w => w.title?.toUpperCase() !== 'FIREDOG TOTAL');
  const displayWorkout = todayWorkout || (isSelectedToday ? latestWod || null : null);

  const displayName = profile?.full_name?.split(' ')[0] || user?.user_metadata?.full_name?.split(' ')[0] || 'Athlete';

  const handleStartWorkout = (workoutId: string) => {
    if (requireAuth('Start Workout')) {
      navigate(`/workout/${workoutId}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }




  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <img src={firedogLogo} alt="FiredogWorks" className="w-9 h-9 object-contain" />
          <div>
            <p className="text-sm text-muted-foreground">
              {isGuest ? 'Welcome to' : 'Welcome back,'}
            </p>
            <h1 className="text-xl font-bold">{isGuest ? 'FiredogWorks' : displayName}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.open('https://www.instagram.com/firedogworks', '_blank')}
            className="p-2 rounded-full bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Instagram"
          >
            <Instagram className="h-5 w-5" />
          </button>
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

      {/* Weekly Date Strip */}
      <NewMonthBanner />
      <WeeklyDateStrip selectedDate={selectedDate} onDateSelect={setSelectedDate} />

      {/* Banner */}
      <div className="mb-6 rounded-xl gradient-fire p-6 shadow-fire">
        <h2 className="text-2xl font-bold text-primary-foreground">FORGE YOUR FIRE</h2>
        <p className="mt-1 text-sm text-primary-foreground/80">Your daily training awaits.</p>
      </div>

      {/* WOD for selected date */}
      {displayWorkout ? (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              {isSelectedToday ? 'WORKOUT OF THE DAY' : format(selectedDate, 'MMM d') + ' WORKOUT'}
            </h2>
          </div>
          <button
            onClick={() => navigate(`/workout/${displayWorkout.id}`)}
            className="w-full rounded-xl bg-card border border-border p-5 text-left shadow-card hover:border-primary/50 transition-colors"
          >
            <h3 className="text-lg font-bold font-display">{displayWorkout.title}</h3>
            <p className="text-sm text-muted-foreground mt-1">{displayWorkout.description}</p>
            <div className="mt-3">
              <span className="text-xs text-primary font-semibold">VIEW WORKOUT →</span>
            </div>
          </button>
        </div>
      ) : (
        <div className="mb-6 rounded-xl bg-card border border-border p-8 text-center shadow-card">
          <p className="text-3xl mb-2">🐾</p>
          <h3 className="text-lg font-bold font-display">No workout scheduled yet</h3>
          <p className="text-sm text-muted-foreground mt-1">
            No workout scheduled yet — check back soon!
          </p>
          {!isSelectedToday && (
            <button
              onClick={() => setSelectedDate(today)}
              className="mt-3 text-xs text-primary font-semibold hover:underline"
            >
              ← Back to today
            </button>
          )}
        </div>
      )}


      {/* Active Challenges */}
      {activeFiredogChallenge && (
        <div className="mb-6">
          <h2 className="text-lg font-bold mb-3">🔥 ACTIVE CHALLENGES</h2>
          <div className="space-y-3">
            <div className="rounded-xl bg-card border border-border p-4 shadow-card">
              <h3 className="font-bold font-display text-sm">🔥 FIREDOG TOTAL</h3>
              <p className="text-xs text-muted-foreground mt-1">{activeFiredogChallenge.description}</p>
              <div className="mt-2 flex items-center justify-end">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7 border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                  onClick={() => navigate(`/workout/${activeFiredogChallenge.id}`)}
                >
                  View Challenge
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Program Cards */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">PROGRAMS</h2>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => navigate('/programs')}
            className="rounded-xl bg-card border border-border overflow-hidden shadow-card text-left hover:border-primary/50 transition-colors"
          >
            <div className="w-full h-24 overflow-hidden">
              <img src={inferno45Cover} alt="Engine" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-3">
              <h3 className="font-bold font-display text-sm">ENGINE</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Aerobic conditioning</p>
            </div>
          </button>
          <button
            onClick={() => navigate('/programs')}
            className="rounded-xl bg-card border border-border overflow-hidden shadow-card text-left hover:border-primary/50 transition-colors"
          >
            <div className="w-full h-24 overflow-hidden">
              <img src={stationStrengthCover} alt="Firedog" className="w-full h-full object-cover" loading="lazy" />
            </div>
            <div className="p-3">
              <h3 className="font-bold font-display text-sm">FIREDOG</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Full 5-section training</p>
            </div>
          </button>
        </div>
      </div>

      {/* Our Philosophy */}
      <div className="mb-6">
        <h2 className="text-lg font-bold mb-3">OUR PHILOSOPHY</h2>
        <div className="rounded-xl overflow-hidden border border-border shadow-card">
          <img
            src={philosophyImage}
            alt="Firefighting in 100 Words"
            className="w-full h-auto"
            loading="lazy"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 flex items-center justify-center gap-4 pb-2">
        <button
          onClick={() => window.open('https://www.instagram.com/firedogworks', '_blank')}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <Instagram className="h-4 w-4" />
          @firedogworks
        </button>
      </div>
    </div>
  );
};

export default HomePage;
