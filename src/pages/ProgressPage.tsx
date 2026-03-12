import { ArrowLeft, Calendar, Dumbbell, TrendingUp, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { mockWorkoutLogs, mockWorkouts, mockUser } from '@/data/mockData';
import { AreaChart, Area, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const chartData = mockWorkoutLogs.map((log, i) => ({
  day: `Day ${i + 1}`,
  weight: log.weight || 0,
})).reverse();

const ProgressPage = () => {
  const navigate = useNavigate();

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">PROGRESS</h1>

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <Dumbbell className="h-5 w-5 mx-auto text-primary mb-1" />
          <p className="text-2xl font-bold">{mockUser.completed_workouts}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Workouts</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <TrendingUp className="h-5 w-5 mx-auto text-accent mb-1" />
          <p className="text-2xl font-bold">{mockUser.points}</p>
          <p className="text-[10px] text-muted-foreground uppercase">Points</p>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 text-center shadow-card">
          <Calendar className="h-5 w-5 mx-auto text-fire-yellow mb-1" />
          <p className="text-2xl font-bold">5</p>
          <p className="text-[10px] text-muted-foreground uppercase">Day Streak</p>
        </div>
      </div>

      {/* Chart */}
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

      {/* Workout History */}
      <h2 className="text-sm font-bold font-display mb-3">WORKOUT HISTORY</h2>
      <div className="space-y-3">
        {mockWorkoutLogs.map((log) => {
          const workout = mockWorkouts.find(w => w.id === log.workout_id);
          const date = new Date(log.completion_date);
          return (
            <div key={log.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold font-display text-sm">{workout?.title || 'Workout'}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </p>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  {log.weight && <span>{log.weight} lbs</span>}
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
    </div>
  );
};

export default ProgressPage;
