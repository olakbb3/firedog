import { useMemo } from 'react';
import { Trophy, Activity } from 'lucide-react';
import type { CrewEntry } from '@/hooks/useLeaderboard';
import type { WorkoutSection } from '@/types/index';
import AthleteBadges from '@/components/AthleteBadges';
import { displayWeightValue, reformatWeightString, setPreferredUnit, useUnitPreference, type UnitSystem } from '@/lib/units';

interface Props {
  crew: CrewEntry[];
  rawLogs: any[];
  sections: WorkoutSection[];
}

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const normalizeLift = (name: string) =>
  name.toLowerCase().replace('1rm ', '').trim();

const displayLiftName = (name: string) => {
  const normalized = normalizeLift(name);
  return normalized ? `1RM ${normalized}`.toUpperCase() : '1RM UNKNOWN';
};

const FiredogLeaderboard = ({ crew, rawLogs, sections }: Props) => {
  const unit = useUnitPreference();
  const sectionMap = useMemo(() => new Map(sections.map(s => [s.id, s.section_name])), [sections]);

  // Per-lift top 3
  const perLiftLeaders = useMemo(() => {
    const grouped: Record<string, any[]> = {};
    rawLogs.forEach(log => {
      if (!log.workout_section_id) return;
      const key = normalizeLift(sectionMap.get(log.workout_section_id) || log.workout_section_id);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(log);
    });

    return Object.entries(grouped).map(([liftName, logs]) => {
      // Deduplicate by user, keep max weight
      const userMax = new Map<string, any>();
      for (const log of logs) {
        const existing = userMax.get(log.user_id);
        if (!existing || (log.weight ?? 0) > (existing.weight ?? 0)) {
          userMax.set(log.user_id, log);
        }
      }
      const sorted = Array.from(userMax.values()).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, 3);
      return { liftName, sectionName: displayLiftName(liftName), top3: sorted };
    });
  }, [rawLogs, sectionMap]);

  // Live feed
  const recentLogs = useMemo(() => 
    [...rawLogs]
      .sort((a, b) => new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime())
      .slice(0, 10),
    [rawLogs]
  );

  return (
    <div className="space-y-4 mb-4">
      {/* Card 1 — Overall Total */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Trophy className="h-4 w-4 text-accent" />
          <p className="text-xs font-bold tracking-widest">🏆 OVERALL TOTAL</p>
        </div>
        {crew.length > 0 ? (
          <div className="space-y-1.5">
            {crew.map((entry, i) => (
              <div key={i} className="flex items-center justify-between gap-2 text-sm font-body">
                <span className="flex items-center gap-2 min-w-0 flex-1">
                  <span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span>
                  <span className={`truncate ${i === 0 ? 'text-accent font-semibold' : 'text-foreground'}`}>{entry.user_name}</span>
                  <AthleteBadges profile={entry.affiliation} compact />
                </span>
                <span className="flex items-center gap-2 shrink-0">
                      <span className="text-muted-foreground text-xs">{reformatWeightString(entry.result, unit)}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${entry.is_rx ? 'bg-primary/15 text-primary' : 'bg-secondary text-muted-foreground'}`}>
                    {entry.is_rx ? 'Rx' : 'SC'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground font-body text-center py-3 italic">
            No totals yet. Log your lifts to get on the board!
          </p>
        )}
      </div>

      {/* Card 2 — Per-Lift Leaderboard */}
      <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-primary" />
            <p className="flex-1 text-xs font-bold tracking-widest">🥇 PER-LIFT LEADERS</p>
            <div className="flex rounded-md bg-secondary p-0.5">
              {(['imperial', 'metric'] as UnitSystem[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setPreferredUnit(u)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${unit === u ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
                >
                  {u === 'imperial' ? 'LBS' : 'KG'}
                </button>
              ))}
            </div>
          </div>
          {perLiftLeaders.length > 0 ? (
          <div className="space-y-4">
            {perLiftLeaders.map(({ liftName, sectionName, top3 }) => (
              <div key={liftName}>
                <p className="text-xs font-bold text-primary tracking-widest mb-1.5">{sectionName}</p>
                <div className="space-y-1">
                  {top3.map((log, i) => (
                    <div key={i} className="flex items-center justify-between text-sm font-body">
                      <span className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                        <span className={i === 0 ? 'text-accent font-semibold' : 'text-foreground'}>{log.user_name}</span>
                      </span>
                      <span className="text-muted-foreground text-xs">{displayWeightValue(log.weight, unit)} {unit === 'metric' ? 'kg' : 'lbs'}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          ) : (
            <p className="text-xs text-muted-foreground font-body text-center py-3 italic">No lifts logged yet</p>
          )}
        </div>

      {/* Card 3 — Live Activity Feed */}
      <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="h-4 w-4 text-primary" />
            <p className="text-xs font-bold tracking-widest">📊 LIVE ACTIVITY</p>
          </div>
          {recentLogs.length > 0 ? (
          <div className="space-y-2">
            {recentLogs.map((log, i) => (
              <div key={i} className="flex items-center justify-between text-xs font-body">
                <span className="text-foreground">
                  <span className="font-semibold">{log.user_name}</span>
                  {' logged '}
                  <span className="font-semibold">{displayWeightValue(log.weight, unit)} {unit === 'metric' ? 'kg' : 'lbs'}</span>
                  {' on '}
                  <span className="text-primary">{sectionMap.get(log.workout_section_id) || 'Unknown'}</span>
                </span>
                <span className="text-muted-foreground whitespace-nowrap ml-2">{timeAgo(log.completion_date)}</span>
              </div>
            ))}
          </div>
          ) : (
            <p className="text-xs text-muted-foreground font-body text-center py-3 italic">Be the first to log this month!</p>
          )}
        </div>
    </div>
  );
};

export default FiredogLeaderboard;
