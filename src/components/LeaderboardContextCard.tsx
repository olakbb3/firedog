import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { LeaderboardService } from '@/services/leaderboard.service';

interface RankInfo {
  rank: number | null;
  total: number;
  loggedToday: boolean;
}

/**
 * Read-only "today's rank" card.
 *
 * Computes the user's position among athletes who logged any workout today,
 * ranked by the number of distinct workouts/sections logged. Uses a single
 * lightweight query — no leaderboard hook dependency.
 */
export default function LeaderboardContextCard() {
  const { user } = useAuth();
  const [info, setInfo] = useState<RankInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    if (!user) {
      setLoading(false);
      return;
    }

    (async () => {
      setLoading(true);
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const { data, error } = await LeaderboardService.getTodayLogCounts({
        _from: dayStart.toISOString(),
        _to: dayEnd.toISOString(),
      });

      if (cancelled) return;
      if (error || !data) {
        setInfo(null);
        setLoading(false);
        return;
      }

      const counts = new Map<string, number>();
      for (const row of data) {
        counts.set(row.user_id, Number(row.log_count) || 0);
      }

      const total = counts.size;
      const loggedToday = counts.has(user.id);

      let rank: number | null = null;
      if (loggedToday) {
        const myCount = counts.get(user.id) ?? 0;
        const sorted = Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
        const idx = sorted.findIndex(([uid]) => uid === user.id);
        rank = idx >= 0 ? idx + 1 : null;
        // Tie-aware rank: count users strictly ahead + 1
        let ahead = 0;
        for (const [, c] of sorted) if (c > myCount) ahead++;
        rank = ahead + 1;
      }

      setInfo({ rank, total, loggedToday });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !info || info.total === 0) return null;

  return (
    <div className="rounded-xl bg-card border border-border p-4 mb-6 shadow-card">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="h-4 w-4 text-fire-yellow" />
        <h2 className="text-sm font-bold font-display">TODAY'S RANK</h2>
      </div>
      {info.loggedToday && info.rank ? (
        <p className="text-sm font-body">
          <span className="text-2xl font-bold tabular-nums">#{info.rank}</span>
          <span className="text-muted-foreground ml-2">
            of {info.total} athlete{info.total === 1 ? '' : 's'}
          </span>
        </p>
      ) : (
        <p className="text-xs text-muted-foreground font-body">
          Log a workout to see today's rank
        </p>
      )}
    </div>
  );
}
