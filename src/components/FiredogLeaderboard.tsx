import { Trophy } from 'lucide-react';
import type { CrewEntry } from '@/hooks/useLeaderboard';
import type { WorkoutSection } from '@/types/index';
import AthleteBadges from '@/components/AthleteBadges';
import { reformatWeightString, useUnitPreference } from '@/lib/units';
import PerLiftLeaderboard from '@/components/PerLiftLeaderboard';
import LiveActivityFeed from '@/components/LiveActivityFeed';

interface Props {
  crew: CrewEntry[];
  rawLogs: any[];
  sections: WorkoutSection[];
}

const FiredogLeaderboard = ({ crew, rawLogs, sections }: Props) => {
  const unit = useUnitPreference();
  console.log('STEP 7 — rawLogs IN UI:', rawLogs);

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

      <PerLiftLeaderboard rawLogs={rawLogs} sections={sections} />
      <LiveActivityFeed rawLogs={rawLogs} sections={sections} />
    </div>
  );
};

export default FiredogLeaderboard;
