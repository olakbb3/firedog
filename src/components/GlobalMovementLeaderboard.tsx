import { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { getGlobalLeaderboard } from '@/services/leaderboard.service';
import { useAuth } from '@/contexts/AuthContext';
import MovementSelector, { type Movement } from '@/components/workout/MovementSelector';

interface GlobalRow {
  movement_id: string;
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  best_weight: number | null;
  best_reps: number | null;
  best_time: string | null;
  latest_activity: string | null;
}

const formatResult = (row: GlobalRow): { value: string; sort: number; type: 'weight' | 'reps' | 'time' | 'none' } => {
  if (row.best_weight != null) return { value: `${row.best_weight} lbs`, sort: row.best_weight, type: 'weight' };
  if (row.best_reps != null) return { value: `${row.best_reps} reps`, sort: row.best_reps, type: 'reps' };
  if (row.best_time) {
    const parts = row.best_time.split(':').map(Number);
    const secs = parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : (parts[0] || 0) * 60 + (parts[1] || 0);
    return { value: row.best_time, sort: secs, type: 'time' };
  }
  return { value: '—', sort: 0, type: 'none' };
};

export default function GlobalMovementLeaderboard() {
  const { user } = useAuth();
  const [movement, setMovement] = useState<Movement | null>(null);
  const [rows, setRows] = useState<GlobalRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!movement) { setRows([]); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await getGlobalLeaderboard(movement.id);
        if (cancelled) return;
        if (error) {
          console.error('get_global_leaderboard error', error);
          setRows([]);
          return;
        }
        setRows((data ?? []) as GlobalRow[]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [movement]);

  const sorted = [...rows].map(r => ({ r, fmt: formatResult(r) }))
    .sort((a, b) => {
      if (a.fmt.type === 'time' && b.fmt.type === 'time') return a.fmt.sort - b.fmt.sort;
      return b.fmt.sort - a.fmt.sort;
    });

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-accent" />
        <p className="text-xs font-bold tracking-widest">GLOBAL PR LEADERBOARD</p>
      </div>

      <div className="mb-3">
        <MovementSelector
          movement={movement}
          customName=""
          onSelectMovement={setMovement}
          onCustomNameChange={() => {}}
          placeholder="Pick a movement to rank…"
        />
      </div>

      {!movement ? (
        <p className="text-xs text-muted-foreground font-body text-center py-3 italic">
          Select a movement to see the global leaderboard.
        </p>
      ) : loading ? (
        <div className="flex justify-center py-6">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : sorted.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body text-center py-3 italic">
          No PRs logged for this movement yet.
        </p>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(({ r, fmt }, i) => {
            const isMe = r.user_id === user?.id;
            return (
              <div
                key={r.user_id}
                className={`flex items-center justify-between gap-2 text-sm font-body rounded-lg px-2 py-1.5 ${
                  isMe ? 'bg-primary/10 ring-1 ring-primary/30' : ''
                }`}
              >
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                  {r.avatar_url ? (
                    <img src={r.avatar_url} alt="" className="h-6 w-6 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="h-6 w-6 rounded-full bg-secondary shrink-0" />
                  )}
                  <span className={`truncate ${i === 0 ? 'text-accent font-semibold' : 'text-foreground'} ${isMe ? 'font-semibold' : ''}`}>
                    {r.display_name || 'Athlete'}
                    {isMe && <span className="text-[10px] text-muted-foreground ml-1">(You)</span>}
                  </span>
                </span>
                <span className="text-muted-foreground text-xs font-mono shrink-0">{fmt.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
