import { useMemo } from 'react';
import { Trophy } from 'lucide-react';
import type { WorkoutSection } from '@/types/index';
import { displayWeightValue, useUnitPreference } from '@/lib/units';
import { useAuth } from '@/contexts/AuthContext';

interface Props {
  rawLogs: any[];
  sections: WorkoutSection[];
}

const normalizeLift = (name: string) =>
  name.toLowerCase().replace(/^1rm\s+/i, '').trim();

const displayLiftName = (name: string) => {
  const normalized = normalizeLift(name);
  return normalized ? `1RM ${normalized}`.toUpperCase() : '1RM UNKNOWN';
};

const PerLiftLeaderboard = ({ rawLogs, sections }: Props) => {
  const unit = useUnitPreference();
  const { user } = useAuth();

  const perLiftLeaders = useMemo(() => {
    console.log('STEP 8 — GROUPING INPUT:', rawLogs);
    const sectionMap = new Map(sections.map(s => [s.id, s.section_name]));
    const grouped = new Map<string, any[]>();

    rawLogs.forEach(log => {
      if (!log.workout_section_id || log.weight == null) return;
      const resolvedName = sectionMap.get(log.workout_section_id) || log.workout_section_id;
      const key = normalizeLift(resolvedName);
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(log);
    });

    return Array.from(grouped.entries()).map(([liftName, logs]) => {
      const userMax = new Map<string, any>();
      logs.forEach(log => {
        const existing = userMax.get(log.user_id);
        if (!existing || (log.weight ?? 0) > (existing.weight ?? 0)) userMax.set(log.user_id, log);
      });
      const ranked = Array.from(userMax.values()).sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
      return { liftName, sectionName: displayLiftName(liftName), leader: ranked[0], top3: ranked.slice(0, 3), userEntry: user?.id ? ranked.find(l => l.user_id === user.id) : null };
    });
  }, [rawLogs, sections, user?.id]);

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="h-4 w-4 text-primary" />
        <p className="flex-1 text-xs font-bold tracking-widest">🥇 PER-LIFT LEADERS</p>
      </div>
      {perLiftLeaders.length > 0 ? (
        <div className="grid grid-cols-2 gap-3">
          {perLiftLeaders.map(({ liftName, sectionName, top3, leader, userEntry }) => {
            const gap = leader && userEntry ? displayWeightValue((leader.weight ?? 0) - (userEntry.weight ?? 0), unit) : 0;
            return (
              <div key={liftName} className="rounded-lg border border-border bg-secondary/30 p-3 min-w-0">
                <p className="text-xs font-bold text-primary tracking-widest mb-2 truncate">{sectionName}</p>
                <div className="space-y-1.5">
                  {top3.map((log, i) => {
                    const isCurrentUser = user?.id === log.user_id;
                    return (
                      <div key={`${log.user_id}-${i}`} className="flex items-center justify-between gap-2 text-xs font-body min-w-0">
                        <span className="flex items-center gap-1.5 min-w-0 flex-1">
                          <span className="text-muted-foreground w-3 text-right shrink-0">{i + 1}.</span>
                          <span className={`truncate ${isCurrentUser ? 'text-accent font-semibold' : 'text-foreground'}`}>{log.user_name}</span>
                        </span>
                        <span className="text-muted-foreground shrink-0">{displayWeightValue(log.weight, unit)} {unit === 'metric' ? 'kg' : 'lbs'}</span>
                      </div>
                    );
                  })}
                </div>
                {userEntry && leader?.user_id !== userEntry.user_id && (
                  <p className="mt-2 text-[10px] text-accent font-semibold leading-tight">
                    {gap} {unit === 'metric' ? 'kg' : 'lbs'} behind the leader
                  </p>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground font-body text-center py-3 italic">No lifts logged yet</p>
      )}
    </div>
  );
};

export default PerLiftLeaderboard;
export { normalizeLift, displayLiftName };
