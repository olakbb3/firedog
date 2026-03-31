import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useLeaderboard } from '@/hooks/useLeaderboard';
import type { WorkoutSection } from '@/types/index';

const LeaderboardPage = () => {
  const [workoutId, setWorkoutId] = useState<string | undefined>();
  const [workoutTitle, setWorkoutTitle] = useState<string>('');
  const [sections, setSections] = useState<WorkoutSection[]>([]);

  useEffect(() => {
    const fetchTodayWorkout = async () => {
      const today = new Date().toISOString().split('T')[0];
      let { data } = await supabase
        .from('workouts')
        .select('id, title, workout_date')
        .eq('workout_date', today)
        .limit(1)
        .maybeSingle();

      if (!data) {
        const res = await supabase
          .from('workouts')
          .select('id, title, workout_date')
          .order('workout_date', { ascending: false })
          .limit(1)
          .maybeSingle();
        data = res.data;
      }

      if (data) {
        setWorkoutId(data.id);
        setWorkoutTitle(data.title);
        const { data: secs } = await supabase
          .from('workout_sections')
          .select('*')
          .eq('workout_id', data.id)
          .order('order_index');
        if (secs) setSections(secs);
      }
    };
    fetchTodayWorkout();
  }, []);

  const { crew } = useLeaderboard(workoutId, sections);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-2 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-accent" />
        LEADERBOARD
      </h1>
      {workoutTitle && (
        <p className="text-xs text-muted-foreground mb-6 tracking-wide">{workoutTitle}</p>
      )}

      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-accent" />
          <p className="text-xs font-bold tracking-widest">TOP CREW</p>
        </div>
        {crew.length > 0 ? (
          <div className="space-y-1.5">
            {crew.map((entry, i) => (
              <div key={i} className="flex items-center justify-between text-sm font-body">
                <span className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                  <span className={i === 0 ? 'text-accent font-semibold' : 'text-foreground'}>{entry.user_name}</span>
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-muted-foreground text-xs">{entry.result}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${entry.is_rx ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {entry.is_rx ? 'Rx' : 'SC'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-body text-center py-3 italic">
            No results yet. Be the first to log today's workout.
          </p>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
