import { useMemo } from 'react';
import { Activity } from 'lucide-react';
import type { WorkoutSection } from '@/types/index';
import { displayWeightValue, useUnitPreference } from '@/lib/units';
import { displayLiftName } from '@/components/PerLiftLeaderboard';

interface Props {
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
  return `${Math.floor(hrs / 24)}d ago`;
};

const LiveActivityFeed = ({ rawLogs, sections }: Props) => {
  const unit = useUnitPreference();
  const sectionMap = useMemo(() => new Map(sections.map(s => [s.id, s.section_name])), [sections]);
  const recentLogs = useMemo(() =>
    [...rawLogs]
      .filter(log => log.weight != null)
      .sort((a, b) => new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime())
      .slice(0, 10),
    [rawLogs]
  );

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Activity className="h-4 w-4 text-primary" />
        <p className="text-xs font-bold tracking-widest">📊 LIVE ACTIVITY</p>
      </div>
      {recentLogs.length > 0 ? (
        <div className="space-y-2">
          {recentLogs.map((log, i) => (
            <div key={`${log.user_id}-${log.completion_date}-${i}`} className="flex items-center justify-between gap-2 text-xs font-body min-w-0">
              <span className="text-foreground min-w-0 flex-1">
                <span className="font-semibold">{log.user_name}</span>
                {' logged '}
                <span className="font-semibold">{displayWeightValue(log.weight, unit)} {unit === 'metric' ? 'kg' : 'lbs'}</span>
                {' on '}
                <span className="text-primary">{displayLiftName(sectionMap.get(log.workout_section_id) || 'Unknown')}</span>
              </span>
              <span className="text-muted-foreground whitespace-nowrap shrink-0">{timeAgo(log.completion_date)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground font-body text-center py-3 italic">Be the first to log this month!</p>
      )}
    </div>
  );
};

export default LiveActivityFeed;
