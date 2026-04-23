import { useEffect, useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useUnitPreference, convertWeight, type UnitSystem } from '@/lib/units';

type ResultType =
  | 'completed'
  | 'time'
  | 'rounds_reps'
  | 'calories'
  | 'meters'
  | 'weight';

export interface HistoryDetailLog {
  id: string;
  workout_id: string;
  workout_section_id?: string | null;
  exercise_name?: string | null;
  result_type?: ResultType | string | null;
  reps?: number | null;
  rounds?: number | null;
  weight?: number | null;
  calories?: number | null;
  meters?: number | null;
  time?: string | null;
  is_rx?: boolean | null;
  notes?: string | null;
  completion_date: string;
}

interface SectionRow {
  id: string;
  section_name: string;
  order_index: number | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  workoutTitle: string;
  workoutId: string;
  /** All logs for this workout (single completion_date — same calendar day). */
  logs: HistoryDetailLog[];
}

const formatScore = (log: HistoryDetailLog, unit: UnitSystem): string => {
  switch (log.result_type) {
    case 'weight':
      return log.weight != null ? convertWeight(log.weight, unit) : '—';
    case 'time':
      return log.time || '—';
    case 'rounds_reps': {
      if (log.rounds == null && log.reps == null) return '—';
      const r = log.rounds ?? 0;
      const reps = log.reps ?? 0;
      return reps > 0 ? `${r}R+${reps}r` : `${r}R`;
    }
    case 'calories':
      return log.calories != null ? `${log.calories} cals` : '—';
    case 'meters':
      return log.meters != null ? `${log.meters} m` : '—';
    case 'completed':
      return '✓ Completed';
    default:
      if (log.weight != null) return convertWeight(log.weight, unit);
      if (log.time) return log.time;
      return '—';
  }
};

export default function WorkoutHistoryDetailModal({
  open,
  onOpenChange,
  workoutTitle,
  workoutId,
  logs,
}: Props) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const unit = useUnitPreference(user?.id);
  const [sectionMap, setSectionMap] = useState<Record<string, SectionRow>>({});

  // Fetch section names if missing — only on first open per workout.
  useEffect(() => {
    if (!open) return;
    const sectionIds = Array.from(
      new Set(logs.map((l) => l.workout_section_id).filter(Boolean) as string[])
    );
    if (sectionIds.length === 0) return;
    const missing = sectionIds.filter((id) => !sectionMap[id]);
    if (missing.length === 0) return;

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('workout_sections')
        .select('id, section_name, order_index')
        .in('id', missing);
      if (cancelled || !data) return;
      setSectionMap((prev) => {
        const next = { ...prev };
        for (const s of data) next[s.id] = s as SectionRow;
        return next;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [open, logs, sectionMap]);

  const dateLabel = useMemo(() => {
    const first = logs[0]?.completion_date;
    if (!first) return '';
    try {
      return format(parseISO(first), 'EEE, MMM d, yyyy');
    } catch {
      return '';
    }
  }, [logs]);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      const ai = a.workout_section_id
        ? sectionMap[a.workout_section_id]?.order_index ?? 99
        : 99;
      const bi = b.workout_section_id
        ? sectionMap[b.workout_section_id]?.order_index ?? 99
        : 99;
      return ai - bi;
    });
  }, [logs, sectionMap]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[85vh] bg-card border-border flex flex-col"
      >
        <SheetHeader>
          <SheetTitle className="text-left font-display tracking-wider truncate">
            {workoutTitle}
          </SheetTitle>
          {dateLabel && (
            <p className="text-xs text-muted-foreground text-left">{dateLabel}</p>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-3 space-y-2 pb-4">
          {sortedLogs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8 font-body">
              No log details available.
            </p>
          ) : (
            sortedLogs.map((log) => {
              const sectionName = log.workout_section_id
                ? sectionMap[log.workout_section_id]?.section_name
                : null;
              const label =
                log.exercise_name?.trim() || sectionName || 'Workout';
              const isRx = log.is_rx ?? true;
              const showBadge = log.result_type && log.result_type !== 'completed';
              return (
                <div
                  key={log.id}
                  className="rounded-lg border border-border bg-background/50 px-3 py-2.5"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold font-body truncate">
                        {label}
                      </p>
                      {sectionName && log.exercise_name && (
                        <p className="text-[10px] text-muted-foreground truncate">
                          {sectionName}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {formatScore(log, unit)}
                      </span>
                      {showBadge && (
                        <Badge
                          variant={isRx ? 'default' : 'secondary'}
                          className="text-[10px] px-1.5 py-0 h-5"
                        >
                          {isRx ? 'Rx' : 'SC'}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {log.notes && (
                    <p className="text-xs text-muted-foreground mt-1.5 italic">
                      “{log.notes}”
                    </p>
                  )}
                </div>
              );
            })
          )}
        </div>

        <Button
          variant="outline"
          className="w-full font-display"
          onClick={() => {
            onOpenChange(false);
            navigate(`/workout/${workoutId}`);
          }}
        >
          <ExternalLink className="h-4 w-4 mr-2" />
          VIEW FULL WORKOUT
        </Button>
      </SheetContent>
    </Sheet>
  );
}
