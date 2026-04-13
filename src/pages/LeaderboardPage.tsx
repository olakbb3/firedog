import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { SectionResultType } from '@/types/index';

interface WorkoutOption {
  id: string;
  title: string;
  workout_date: string;
}

interface LeaderboardRow {
  user_id: string;
  user_name: string;
  result: string;
  sort_value: number;
  is_rx: boolean;
}

type RxFilter = 'all' | 'rx' | 'scaled';

const LeaderboardPage = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const [workouts, setWorkouts] = useState<WorkoutOption[]>([]);
  const [selectedWorkoutId, setSelectedWorkoutId] = useState<string>('');
  const [rxFilter, setRxFilter] = useState<RxFilter>('all');
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch recent workouts for dropdown
  useEffect(() => {
    const fetch = async () => {
      const { data } = await supabase
        .from('workouts')
        .select('id, title, workout_date')
        .order('workout_date', { ascending: false })
        .limit(30);
      if (data) {
        setWorkouts(data);
        const urlWid = searchParams.get('workout');
        if (urlWid && data.some(w => w.id === urlWid)) {
          setSelectedWorkoutId(urlWid);
        } else if (data.length > 0) {
          setSelectedWorkoutId(data[0].id);
        }
      }
      setLoading(false);
    };
    fetch();
  }, []);

  // Update URL when workout changes
  const handleWorkoutChange = (wid: string) => {
    setSelectedWorkoutId(wid);
    setSearchParams({ workout: wid });
  };

  // Fetch leaderboard data for selected workout
  useEffect(() => {
    if (!selectedWorkoutId) { setRows([]); return; }

    const fetchBoard = async () => {
      // Get sections for this workout to determine result_type
      const { data: sections } = await supabase
        .from('workout_sections')
        .select('id, section_name, result_type')
        .eq('workout_id', selectedWorkoutId)
        .order('order_index');

      // Find the main scoring section (First-In) or fallback to first non-completed
      const secs = sections || [];
      const firstIn = secs.find(s =>
        s.section_name.toLowerCase().includes('first-in') || s.section_name.toLowerCase().includes('first in')
      );
      const scoringSection = firstIn || secs.find(s => s.result_type !== 'completed') || secs[0];

      if (!scoringSection) { setRows([]); return; }

      const resultType: SectionResultType = (scoringSection.result_type as SectionResultType) || 'completed';

      const { data: logs } = await supabase
        .from('workout_logs')
        .select('user_id, result_type, time, rounds, reps, calories, meters, weight, is_rx, completion_date')
        .eq('workout_id', selectedWorkoutId)
        .eq('workout_section_id', scoringSection.id)
        .order('completion_date', { ascending: false })
        .limit(200);

      if (!logs || logs.length === 0) { setRows([]); return; }

      // Deduplicate: latest per user
      const latestByUser = new Map<string, typeof logs[0]>();
      for (const log of logs) {
        if (!latestByUser.has(log.user_id)) latestByUser.set(log.user_id, log);
      }

      const userIds = Array.from(latestByUser.keys());
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      const nameMap = new Map((profiles || []).map(p => [p.id, p.full_name || 'Athlete']));

      const entries: LeaderboardRow[] = [];
      for (const [uid, log] of Array.from(latestByUser.entries())) {
        let result = 'Logged';
        let sortValue = 0;

        switch (resultType) {
          case 'time':
            result = log.time || 'Timed';
            // Convert MM:SS to seconds for sorting
            if (log.time) {
              const parts = log.time.split(':');
              sortValue = (parseInt(parts[0]) || 0) * 60 + (parseInt(parts[1]) || 0);
            } else {
              sortValue = 999999;
            }
            break;
          case 'rounds_reps':
            {
              const parts: string[] = [];
              if (log.rounds != null) parts.push(`${log.rounds}R`);
              if (log.reps != null) parts.push(`${log.reps}r`);
              result = parts.join('+') || 'Logged';
              sortValue = (log.rounds || 0) * 1000 + (log.reps || 0);
            }
            break;
          case 'calories':
            result = log.calories != null ? `${log.calories} cal` : 'Logged';
            sortValue = log.calories || 0;
            break;
          case 'meters':
            result = log.meters != null ? `${log.meters} m` : 'Logged';
            sortValue = log.meters || 0;
            break;
          case 'weight':
            result = log.weight != null ? `${log.weight} lbs` : 'Logged';
            sortValue = log.weight || 0;
            break;
          case 'completed':
            result = 'Completed';
            sortValue = 0;
            break;
        }

        entries.push({ user_id: uid, user_name: nameMap.get(uid) || 'Athlete', result, sort_value: sortValue, is_rx: log.is_rx ?? true } as LeaderboardRow);
      }

      // Sort: time ascending, everything else descending
      if (resultType === 'time') {
        entries.sort((a, b) => a.sort_value - b.sort_value);
      } else {
        entries.sort((a, b) => b.sort_value - a.sort_value);
      }

      setRows(entries);
    };

    fetchBoard();
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

      {/* Workout Selector */}
      <div className="mb-3">
        <Select value={selectedWorkoutId} onValueChange={handleWorkoutChange}>
          <SelectTrigger className="bg-card border-border text-sm">
            <SelectValue placeholder="Select a workout" />
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
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-accent" />
          <p className="text-xs font-bold tracking-widest">TOP CREW</p>
        </div>

        {filteredRows.length > 0 ? (
          <div className="space-y-1.5">
            {filteredRows.map((entry, i) => {
              const isCurrentUser = entry.user_id === user?.id;
              return (
                <div
                  key={entry.user_id}
                  className={`flex items-center justify-between text-sm font-body rounded-lg px-2 py-1.5 ${
                    isCurrentUser ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                    <span className={`${i === 0 ? 'text-accent font-semibold' : 'text-foreground'} ${isCurrentUser ? 'font-semibold' : ''}`}>
                      {entry.user_name}
                      {isCurrentUser && <span className="text-[10px] text-muted-foreground ml-1">(You)</span>}
                    </span>
                  </span>
                  <span className="flex items-center gap-2">
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
    </div>
  );
};

export default LeaderboardPage;
