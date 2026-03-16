import { useEffect, useState } from 'react';
import { Trophy, Flame } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

interface LeaderboardEntry {
  id: string;
  full_name: string | null;
  points: number;
  completed_workouts: number;
}

const medals = ['🥇', '🥈', '🥉'];

const LeaderboardPage = () => {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, points, completed_workouts')
        .order('points', { ascending: false })
        .limit(20);
      if (data) setEntries(data);
    };
    fetchLeaderboard();
  }, []);

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <Trophy className="h-6 w-6 text-accent" />
        LEADERBOARD
      </h1>

      {/* Top 3 Podium */}
      {entries.length >= 3 && (
        <div className="flex items-end justify-center gap-3 mb-8">
          {[1, 0, 2].map((idx) => {
            const entry = entries[idx];
            if (!entry) return null;
            const isFirst = idx === 0;
            return (
              <div key={entry.id} className={`flex flex-col items-center ${isFirst ? 'order-2' : idx === 1 ? 'order-1' : 'order-3'}`}>
                <span className="text-2xl mb-1">{medals[idx]}</span>
                <div className={`rounded-full flex items-center justify-center font-bold font-display ${
                  isFirst ? 'w-16 h-16 gradient-fire text-primary-foreground text-xl shadow-fire' : 'w-12 h-12 bg-secondary text-foreground text-sm'
                }`}>
                  {(entry.full_name || 'A').charAt(0)}
                </div>
                <p className={`mt-2 font-display text-xs text-center ${isFirst ? 'text-foreground' : 'text-muted-foreground'}`}>
                  {(entry.full_name || 'Athlete').split(' ')[0]}
                </p>
                <div className="flex items-center gap-1 mt-1">
                  <Flame className="h-3 w-3 text-primary" />
                  <span className="text-xs font-semibold">{entry.points.toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Rankings */}
      <div className="space-y-2">
        {entries.map((entry, idx) => (
          <div
            key={entry.id}
            className={`flex items-center gap-4 rounded-xl p-4 border transition-colors ${
              idx < 3 ? 'bg-card border-primary/30 shadow-card' : 'bg-card border-border shadow-card'
            }`}
          >
            <span className={`w-8 text-center font-display font-bold ${idx < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
              {idx + 1}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">{entry.full_name || 'Athlete'}</p>
              <p className="text-xs text-muted-foreground">{entry.completed_workouts} workouts</p>
            </div>
            <div className="flex items-center gap-1">
              <Flame className="h-4 w-4 text-primary" />
              <span className="font-bold text-sm">{entry.points.toLocaleString()}</span>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No athletes yet. Be the first!</p>
        )}
      </div>
    </div>
  );
};

export default LeaderboardPage;
