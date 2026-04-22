import { useMemo, useState } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { usePersonalRecords } from '@/hooks/usePersonalRecords';
import type { PersonalRecord } from '@/utils/personalRecords';
import PRModal from './PRModal';

const formatDate = (s: string): string => {
  if (!s) return '';
  try {
    const d = parseISO(s);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  } catch {
    return '';
  }
};

const iconFor = (cat: PersonalRecord['category']) =>
  cat === 'strength' ? '💪' : '⏱️';

/**
 * Pick top 4 PRs: 2 strength + 2 metcon/cardio. Fill remaining with most recent.
 */
const pickTopFour = (records: PersonalRecord[]): PersonalRecord[] => {
  const sorted = [...records].sort((a, b) =>
    a.date_achieved < b.date_achieved ? 1 : -1
  );
  const strength = sorted.filter((r) => r.category === 'strength').slice(0, 2);
  const metcon = sorted
    .filter((r) => r.category === 'wod' || r.category === 'cardio')
    .slice(0, 2);

  const picked = new Map<string, PersonalRecord>();
  for (const r of [...strength, ...metcon]) picked.set(r.id, r);

  for (const r of sorted) {
    if (picked.size >= 4) break;
    if (!picked.has(r.id)) picked.set(r.id, r);
  }
  return Array.from(picked.values()).slice(0, 4);
};

export default function PRCard() {
  const { user } = useAuth();
  const { records, loading } = usePersonalRecords(user?.id);
  const [open, setOpen] = useState(false);

  const top = useMemo(() => pickTopFour(records), [records]);

  if (loading) return null;

  return (
    <div className="rounded-xl bg-card border border-border p-4 mb-6 shadow-card">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold font-display">🏆 PERSONAL RECORDS</h2>
        {records.length > 0 && (
          <button
            onClick={() => setOpen(true)}
            className="text-[11px] font-body text-primary hover:underline"
          >
            View All
          </button>
        )}
      </div>

      {top.length === 0 ? (
        <p className="text-xs text-muted-foreground font-body text-center py-2">
          Complete your first workout to start tracking PRs.
        </p>
      ) : (
        <ul className="space-y-2">
          {top.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <span className="shrink-0">{iconFor(r.category)}</span>
                <span className="flex-1 min-w-0 truncate text-sm font-body">
                  {r.movement_name}
                </span>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="text-sm font-semibold tabular-nums">
                  {r.pr_value}
                </span>
                <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                  {formatDate(r.date_achieved)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <PRModal open={open} onOpenChange={setOpen} records={records} />
    </div>
  );
}
