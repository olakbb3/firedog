import { useState, useEffect, useMemo } from 'react';
import { Calendar, Dumbbell, TrendingUp, Flame } from 'lucide-react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutLogService } from '@/services/workoutLog.service';
import * as ProfileService from '@/services/profile.service';
import { WorkoutService } from '@/services/workout.service';

import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Badge } from '@/components/ui/badge';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import PRCard from '@/components/PRCard';
import LeaderboardContextCard from '@/components/LeaderboardContextCard';
import WorkoutHistoryDetailModal, { type HistoryDetailLog } from '@/components/WorkoutHistoryDetailModal';
import QuickLogButton from '@/components/QuickLogButton';
import AuthPrompt from '@/components/AuthPrompt';
import ErrorState from '@/components/ErrorState';
import { useUnitPreference, convertWeight, type UnitSystem } from '@/lib/units';

type ResultType = 'completed' | 'time' | 'rounds_reps' | 'calories' | 'meters' | 'weight';

interface MovementJoin {
  id: string;
  name: string;
  category: string | null;
}

interface WorkoutLog {
  id: string;
  workout_id: string | null;
  workout_section_id?: string | null;
  movement_id?: string | null;
  movements?: MovementJoin | MovementJoin[] | null;
  exercise_name?: string | null;
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

const movementDisplayName = (l: WorkoutLog): string | null => {
  const m = l.movements;
  if (!m) return null;
  if (Array.isArray(m)) return m[0]?.name ?? null;
  return m.name ?? null;
};

interface WorkoutBasic {
  id: string;
  title: string;
}

const formatScore = (log: WorkoutLog, unit: UnitSystem): string => {
  const rt = log.result_type;
  switch (rt) {
    case 'weight':
      return log.weight != null ? convertWeight(log.weight, unit) : '—';
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
      if (log.weight != null) return convertWeight(log.weight, unit);
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
  const unit = useUnitPreference(user?.id);
  const [logs, setLogs] = useState<WorkoutLog[]>([]);
  const [workouts, setWorkouts] = useState<Record<string, string>>({});
  const [workoutHasContent, setWorkoutHasContent] = useState<Record<string, boolean>>({});
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [detailKey, setDetailKey] = useState<string | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const { prLogIds } = usePersonalRecords(user?.id);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    let cancelled = false;

    const fetchData = async () => {
      setError(null);
      setLoading(true);
      try {
        const [logsRes, profileRes, workoutsRes, sectionsRes] = await Promise.all([
          supabase
            .from('workout_logs')
            .select('id, workout_id, workout_section_id, movement_id, movements(id, name, category), exercise_name, result_type, reps, rounds, weight, calories, meters, time, is_rx, notes, completion_date')
            .eq('user_id', user.id)
            .order('completion_date', { ascending: false }),
          supabase.from('profiles').select('points').eq('id', user.id).maybeSingle(),
          WorkoutService.getWorkoutDefinitions(),
          WorkoutService.getAllSectionWorkoutIds(),
        ]);

        if (cancelled) return;

        if (logsRes.error) throw logsRes.error;
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
      } catch (err: any) {
        if (!cancelled) {
          console.error('ProgressPage fetch error:', err);
          setError(err?.message || 'Unable to load data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [user?.id, refreshTick]);

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

  if (error) {
    return <ErrorState message={error} onRetry={() => { setError(null); setRefreshTick((t) => t + 1); }} />;
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

      {/* Today's Rank */}
      <LeaderboardContextCard />

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

      {/* Personal Records */}
      <PRCard />

      {/* Workout History */}
      <h2 className="text-sm font-bold font-display mb-3">WORKOUT HISTORY</h2>
      {logs.length === 0 ? (
        <div className="rounded-xl bg-card border border-border p-6 shadow-card text-center">
          <p className="text-sm text-muted-foreground">No workouts logged yet. Get started!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {logs
            .filter((log) => {
              const isFreestyle = !log.workout_id;
              if (isFreestyle) {
                return formatScore(log, unit) !== '—';
              }
              const wid = log.workout_id as string;
              if (!workouts[wid]) return false;
              const isRestDay = !workoutHasContent[wid];
              if (isRestDay) return true;
              return formatScore(log, unit) !== '—' || log.result_type === 'completed';
            })
            .map((log) => {
              const isFreestyle = !log.workout_id;
              const wid = log.workout_id as string;
              const title = isFreestyle
                ? (movementDisplayName(log) || log.exercise_name || 'Freestyle')
                : (workouts[wid] || 'Workout');
              const isRestDay = !isFreestyle && !workoutHasContent[wid];
              const score = isRestDay ? 'Rest Day 🐾' : formatScore(log, unit);
              const showBadge = !isFreestyle && !isRestDay && log.result_type !== 'completed';
              const isRx = log.is_rx ?? true;
              const dateLabel = formatLogDate(log.completion_date);
              const isPR = !isRestDay && !!log.id && prLogIds.has(log.id);
              const day = log.completion_date.split('T')[0];
              const groupKey = isFreestyle ? `freestyle::${log.id}` : `${wid}::${day}`;
              const clickable = !isRestDay && !isFreestyle;

              return (
                <button
                  key={log.id}
                  type="button"
                  onClick={() => clickable && setDetailKey(groupKey)}
                  disabled={!clickable}
                  className="w-full text-left rounded-xl bg-card border border-border p-4 shadow-card transition-opacity active:opacity-80 hover:border-primary/40 disabled:cursor-default disabled:hover:border-border"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="flex-1 min-w-0 truncate font-bold font-display text-sm">{title}</h3>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-xs font-semibold tabular-nums">{score}</span>
                      {isPR && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-fire-yellow/15 text-fire-yellow whitespace-nowrap"
                          title="Personal Record"
                        >
                          🔥 PR
                        </span>
                      )}
                      {isFreestyle && (
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground whitespace-nowrap">
                          Freestyle
                        </span>
                      )}
                      {showBadge && (
                        <Badge
                          variant={isRx ? 'default' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 h-5"
                        >
                          {isRx ? 'Rx' : 'SC'}
                        </Badge>
                      )}
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">{dateLabel}</span>
                    </div>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground mt-1 text-left">{log.notes}</p>
                  )}
                </button>
              );
            })}
        </div>
      )}

      {detailKey && (() => {
        const [wid, day] = detailKey.split('::');
        const groupLogs = logs.filter(
          (l) => l.workout_id === wid && l.completion_date.split('T')[0] === day
        ) as HistoryDetailLog[];
        return (
          <WorkoutHistoryDetailModal
            open={!!detailKey}
            onOpenChange={(v) => { if (!v) setDetailKey(null); }}
            workoutTitle={workouts[wid] || 'Workout'}
            workoutId={wid}
            logs={groupLogs}
          />
        );
      })()}

      <div className="my-6">
        <QuickLogButton onLogged={() => setRefreshTick((t) => t + 1)} />
      </div>
    </div>
  );
};

export default ProgressPage;
