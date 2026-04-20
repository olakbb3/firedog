import { useState, useEffect } from 'react';
import { Calendar, Dumbbell, TrendingUp, Flame } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabaseClient';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';

type ResultType = 'completed' | 'time' | 'rounds_reps' | 'calories' | 'meters' | 'weight';

interface WorkoutLog {
  id: string;
  workout_id: string;
  workout_section_id?: string | null;
  result_type?: ResultType | null;
  reps?: number | null;
  rounds?: number | null;
  weight?: number | null;
  calories?: number | null;
  meters?: number | null;
  time?: string | null;
  is_rx?: boolean | null;
  notes?: string | null;
  completion_date: string;
}

interface WorkoutBasic {
  id: string;
  title: string;
}

const formatScore = (log: WorkoutLog): string => {
  const rt = log.result_type;
  switch (rt) {
    case 'weight':
      return log.weight != null ? `${log.weight} lbs` : '—';
    case 'time':
      return log.time ? log.time : '—';
    case 'rounds_reps': {
      if (log.rounds == null && log.reps == null) return '—';
      const r = log.rounds ?? 0;
      const reps = log.reps ?? 0;
      return reps > 0 ? `${r}R+${reps}r` : `${r}R`;
    }
    case 'calories':
      return log.calories != null ? `${log.calories} cals` : '—';
    case 'meters':
      return log.meters != null ? `${log.meters} m` : '—';
    case 'completed':
      return '✓ Completed';
    default:
      // No result_type — try to derive
      if (log.weight != null) return `${log.weight} lbs`;
      if (log.time) return log.time;
      if (log.rounds != null || log.reps != null) {
        const r = log.rounds ?? 0;
        const reps = log.reps ?? 0;
        return reps > 0 ? `${r}R+${reps}r` : `${r}R`;
      }
      if (log.calories != null) return `${log.calories} cals`;
      if (log.meters != null) return `${log.meters} m`;
      return '—';
  }
};

const formatLogDate = (dateStr: string): string => {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  } catch {
    return '';
  }
};

const ProgressPage = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [workouts, setWorkouts] = useState<Record<string, string>>({});
  const [workoutHasContent, setWorkoutHasContent] = useState<Record<string, boolean>>({});
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchData = async () => {
      setLoading(true);
      const [logsRes, profileRes, workoutsRes, sectionsRes] = await Promise.all([
        supabase
          .from('workout_logs')
          .select('id, workout_id, workout_section_id, result_type, reps, rounds, weight, calories, meters, time, is_rx, notes, completion_date')
          .eq('user_id', user.id)
          .order('completion_date', { ascending: false }),
        supabase.from('profiles').select('points').eq('id', user.id).maybeSingle(),
        supabase.from('workouts').select('id, title'),
        supabase.from('workout_sections').select('workout_id'),
      ]);

      if (logsRes.data) setLogs(logsRes.data as WorkoutLog[]);
      if (profileRes.data) setPoints(profileRes.data.points ?? 0);
      if (workoutsRes.data) {
        const map: Record<string, string> = {};
        workoutsRes.data.forEach((w: WorkoutBasic) => { map[w.id] = w.title; });
        setWorkouts(map);
      }
      if (sectionsRes.data) {
        const has: Record<string, boolean> = {};
        sectionsRes.data.forEach((s: { workout_id: string }) => { has[s.workout_id] = true; });
        setWorkoutHasContent(has);
      }
      setLoading(false);
    };
    fetchData();
  }, [user]);

  // Calculate streak
  const dayStreak = (() => {
    if (logs.length === 0) return 0;
    const uniqueDays = [...new Set(logs.map(l => l.completion_date.split('T')[0]))].sort().reverse();
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < uniqueDays.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (uniqueDays[i] === expectedStr) {
        streak++;
      } else if (i === 0 && uniqueDays[0] === new Date(today.getTime() - 86400000).toISOString().split('T')[0]) {
        // Allow streak to start from yesterday
        const yesterday = new Date(today.getTime() - 86400000);
        streak = 1;
        for (let j = 1; j < uniqueDays.length; j++) {
          const exp = new Date(yesterday);
          exp.setDate(yesterday.getDate() - j);
          if (uniqueDays[j] === exp.toISOString().split('T')[0]) streak++;
          else break;
        }
        break;
      } else {
        break;
      }
    }
    return streak;
  })();

  // Chart data from logs (ascending order for chart)
  const chartData = [...logs]
    .filter(l => l.weight)
    .reverse()
    .map((log, i) => ({
      day: new Date(log.completion_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      weight: log.weight || 0,
    }));

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">PROGRESS</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{logs.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Workouts</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <TrendingUp className="h-5 w-5 mx-auto text-accent mb-1" />
          <p className="text-2xl font-bold">{points}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Points</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <Calendar className="h-5 w-5 mx-auto text-fire-yellow mb-1" />
          <p className="text-2xl font-bold">{dayStreak}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Day Streak</p>
        </div>
      </div>

      {/* Chart */}
      {chartData.length > 0 ? (
        <div className="rounded-xl bg-card border border-border p-4 mb-6 shadow-card">
          <h2 className="text-sm font-bold font-display mb-4">WEIGHT PROGRESSION</h2>
          <ResponsiveContainer width="100%" height={160}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fireGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="hsl(0, 84%, 50%)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 10, fill: 'hsl(0,0%,55%)' }} axisLine={false} tickLine={false} width={35} />
              <Tooltip contentStyle={{ background: 'hsl(0,0%,11%)', border: '1px solid hsl(0,0%,20%)', borderRadius: '8px', fontSize: 12 }} />
              <Area type="monotone" dataKey="weight" stroke="hsl(0, 84%, 50%)" fill="url(#fireGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border p-6 mb-6 shadow-card text-center">
          <Flame className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm text-muted-foreground">Complete workouts to see your weight progression chart.</p>
        </div>
      )}

      {/* Workout History */}
      <h2 className="text-sm font-bold font-display mb-3">WORKOUT HISTORY</h2>
      {logs.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-6 shadow-card text-center">
          <p className="text-sm text-muted-foreground">No workouts logged yet. Get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const date = new Date(log.completion_date);
            return (
              <div key={log.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold font-display text-sm">{workouts[log.workout_id] || 'Workout'}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {(log.weight !== null && log.weight !== undefined) && <span>{log.weight}</span>}
                    {log.time && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {log.time}
                      </span>
                    )}
                  </div>
                </div>
                {log.notes && <p className="text-xs text-muted-foreground mt-2 italic">{log.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgressPage;
