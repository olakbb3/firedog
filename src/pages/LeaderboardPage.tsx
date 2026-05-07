import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { getWodLeaderboard } from '@/services/leaderboard.service';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SectionResultType } from '@/types/index';
import AthleteBadges, { type AthleteAffiliation } from '@/components/AthleteBadges';
import GlobalMovementLeaderboard from '@/components/GlobalMovementLeaderboard';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface WorkoutOption {
  id: string;
  title: string;
  workout_date: string;
}

interface LeaderboardRow {
  user_id: string;
  user_name: string;
  avatar_url?: string | null;
  result: string;
  sort_value: number;
  is_rx: boolean;
  affiliation?: AthleteAffiliation;
}

type RxFilter = 'all' | 'rx' | 'scaled';

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('');
  const [rxFilter, setRxFilter] = useState<RxFilter>('all');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [isLoadingWorkouts, setIsLoadingWorkouts] = useState(true);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);

  // Today (local timezone) — computed once on mount
  const todayLocal = useMemo(() => new Date().toLocaleDateString('en-CA'), []);

  // Public: fetch valid past workouts for dropdown (once on mount)
  useEffect(() => {
    let cancelled = false;
    const fetchWorkouts = async () => {
      setIsLoadingWorkouts(true);
      const { data: rawWorkouts } = await supabase
        .from('workouts')
        .select('id, title, workout_date')
        .lte('workout_date', todayLocal)
        .order('workout_date', { ascending: false })
        .limit(50);

      if (cancelled) return;
      if (!rawWorkouts || rawWorkouts.length === 0) {
        setWorkouts([]);
        setIsLoadingWorkouts(false);
        return;
      }

      // Fetch sections + exercises in parallel to filter Rest Days client-side
      const ids = rawWorkouts.map(w => w.id);
      const [sectionsRes, exercisesRes] = await Promise.all([
        supabase.from('workout_sections').select('id, workout_id').in('workout_id', ids),
        supabase.from('exercises').select('section_id, workout_id').in('workout_id', ids),
      ]);

      if (cancelled) return;

      const sectionsByWorkout = new Map<string, string[]>();
      for (const s of sectionsRes.data || []) {
        const arr = sectionsByWorkout.get(s.workout_id) || [];
        arr.push(s.id);
        sectionsByWorkout.set(s.workout_id, arr);
      }
      const sectionsWithExercises = new Set<string>();
      const workoutsWithLooseExercises = new Set<string>();
      for (const e of exercisesRes.data || []) {
        if (e.section_id) sectionsWithExercises.add(e.section_id);
        if (e.workout_id) workoutsWithLooseExercises.add(e.workout_id);
      }

      const valid = rawWorkouts.filter(w => {
        const secIds = sectionsByWorkout.get(w.id) || [];
        const hasSectionWithExercises = secIds.some(id => sectionsWithExercises.has(id));
        return hasSectionWithExercises || workoutsWithLooseExercises.has(w.id);
      });

      setWorkouts(valid);

      // Smart default: URL → today → most recent past
      const urlWid = searchParams.get('workout');
      if (urlWid && valid.some(w => w.id === urlWid)) {
        setSelectedWorkoutId(urlWid);
      } else if (valid.length > 0) {
        const todayMatch = valid.find(w => w.workout_date === todayLocal);
        setSelectedWorkoutId(todayMatch?.id || valid[0].id);
      }
      setIsLoadingWorkouts(false);
    };
    fetchWorkouts();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Safety: if selection becomes invalid after refresh, fall back to first valid
  useEffect(() => {
    if (!isLoadingWorkouts && workouts.length > 0 && selectedWorkoutId) {
      if (!workouts.find(w => w.id === selectedWorkoutId)) {
        setSelectedWorkoutId(workouts[0].id);
      }
    }
  }, [workouts, selectedWorkoutId, isLoadingWorkouts]);

  // Update URL when workout changes
  const handleWorkoutChange = (wid: string) => {
    setSelectedWorkoutId(wid);
    setSearchParams({ workout: wid });
  };

  // Fetch leaderboard data for selected workout
  useEffect(() => {
    if (!selectedWorkoutId) { setRows([]); return; }
    let cancelled = false;

    const fetchBoard = async () => {
      setIsLoadingLeaderboard(true);
      try {
        const { data, error } = await getWodLeaderboard(selectedWorkoutId);
        if (cancelled) return;

        if (error) {
          console.error('get_wod_leaderboard error:', error);
          setRows([]);
          return;
        }

        console.log('get_wod_leaderboard data:', data);

        if (!data || data.length === 0) {
          setRows([]);
          return;
        }

        const entries: LeaderboardRow[] = (data as any[]).map((row) => {
          let result = 'Logged';
          let sortValue = 0;
          let resultType: 'time' | 'weight' | 'reps' | 'completed' = 'completed';

          if (row.best_time) {
            resultType = 'time';
            result = row.best_time;
            const parts = String(row.best_time).split(':');
            sortValue = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
          } else if (row.weight != null) {
            resultType = 'weight';
            result = `${row.weight} lbs`;
            sortValue = Number(row.weight) || 0;
          } else if (row.reps != null) {
            resultType = 'reps';
            result = `${row.reps} reps`;
            sortValue = Number(row.reps) || 0;
          } else {
            result = 'Completed';
          }

          return {
            user_id: row.user_id,
            user_name: row.display_name || 'Athlete',
            avatar_url: row.avatar_url || null,
            result,
            sort_value: sortValue,
            is_rx: row.is_rx ?? true,
            affiliation: undefined,
            _resultType: resultType,
          } as LeaderboardRow & { _resultType: string };
        });

        const allTime = entries.every((e: any) => e._resultType === 'time');
        if (allTime) {
          entries.sort((a, b) => a.sort_value - b.sort_value);
        } else {
          entries.sort((a, b) => b.sort_value - a.sort_value);
        }

        if (!cancelled) setRows(entries);
      } finally {
        if (!cancelled) setIsLoadingLeaderboard(false);
      }
    };

    fetchBoard();
    return () => { cancelled = true; };
  }, [selectedWorkoutId]);

  // Apply RX filter
  const filteredRows = useMemo(() => {
    if (rxFilter === 'all') return rows;
    return rows.filter(r => rxFilter === 'rx' ? r.is_rx : !r.is_rx);
  }, [rows, rxFilter]);

  const selectedWorkout = workouts.find(w => w.id === selectedWorkoutId);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-accent" />
        LEADERBOARD
      </h1>

      {!user && (
        <a
          href="/onboarding"
          className="mb-4 block rounded-xl border border-dashed border-border bg-card/50 py-3 text-center text-xs font-display tracking-wider text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          Sign up to log your lifts
        </a>
      )}

      <div className="mb-4">
        <GlobalMovementLeaderboard />
      </div>

      {/* Workout Selector */}
      <div className="mb-3">
        <Select
          value={selectedWorkoutId}
          onValueChange={handleWorkoutChange}
          disabled={isLoadingWorkouts || workouts.length === 0}
        >
          <SelectTrigger className="bg-card border-border text-sm">
            <SelectValue
              placeholder={
                isLoadingWorkouts
                  ? 'Loading...'
                  : workouts.length === 0
                  ? 'No past workouts available'
                  : 'Select a workout'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {workouts.map(w => (
              <SelectItem key={w.id} value={w.id} className="text-sm">
                {w.workout_date} — {w.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* RX / Scaled Toggle */}
      <div className="flex gap-1 mb-4 bg-secondary rounded-lg p-1">
        {(['all', 'rx', 'scaled'] as RxFilter[]).map(f => (
          <button
            key={f}
            onClick={() => setRxFilter(f)}
            className={`flex-1 text-xs font-bold py-1.5 rounded-md transition-colors tracking-wider ${
              rxFilter === f
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {f === 'all' ? 'ALL' : f === 'rx' ? 'RX' : 'SCALED'}
          </button>
        ))}
      </div>

      {/* Results */}
      {selectedWorkoutId && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-accent" />
            <p className="text-xs font-bold tracking-widest">TOP CREW</p>
          </div>

          {isLoadingLeaderboard ? (
            <div className="flex justify-center py-6">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : filteredRows.length > 0 ? (
            <div className="space-y-1.5">
              {filteredRows.map((entry, i) => {
                const isCurrentUser = entry.user_id === user?.id;
                return (
                  <div
                    key={entry.user_id}
                    className={`flex items-center justify-between gap-2 text-sm font-body rounded-lg px-2 py-1.5 ${
                      isCurrentUser ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                    }`}
                  >
                    <span className="flex items-center gap-2 min-w-0 flex-1">
                      <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                      <Avatar className="h-6 w-6 shrink-0">
                        {entry.avatar_url && <AvatarImage src={entry.avatar_url} alt={entry.user_name} />}
                        <AvatarFallback className="text-[10px]">{(entry.user_name || 'A').slice(0, 1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                      <span className={`truncate ${i === 0 ? 'text-accent font-semibold' : 'text-foreground'} ${isCurrentUser ? 'font-semibold' : ''}`}>
                        {entry.user_name}
                        {isCurrentUser && <span className="text-[10px] text-muted-foreground ml-1">(You)</span>}
                      </span>
                      <AthleteBadges profile={entry.affiliation} compact />
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground text-xs font-mono">{entry.result}</span>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${entry.is_rx ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                        {entry.is_rx ? 'Rx' : 'SC'}
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-body text-center py-3 italic">
              No scores yet for this WOD. Set the pace! 🐾
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default LeaderboardPage;
