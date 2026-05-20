import { useEffect, useMemo, useState } from 'react';
import { WorkoutLogService } from '@/services/workoutLog.service';
import { WorkoutService } from '@/services/workout.service';
import {
  buildPRIdSet,
  computePersonalRecords,
  type PersonalRecord,
  type PRLog,
} from '@/utils/personalRecords';

interface UsePersonalRecordsResult {
  records: PersonalRecord[];
  prLogIds: Set<string>;
  loading: boolean;
}

/**
 * Single source of truth for a user's PR set.
 *
 * Components must NOT re-derive PR status — consume `records` for lists and
 * `prLogIds.has(log.id)` for inline 🔥 PR badges in workout history.
 */
export function usePersonalRecords(userId: string | undefined): UsePersonalRecordsResult {
  const [logs, setLogs] = useState<PRLog[]>([]);
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState<boolean>(!!userId);

  useEffect(() => {
    if (!userId) {
      setLogs([]);
      setTitles({});
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    (async () => {
      const [logsRes, workoutsRes] = await Promise.all([
        WorkoutLogService.getHistoryForUser(userId),
        WorkoutService.getWorkoutDefinitions(),
      ]);

      if (cancelled) return;

      const nextLogs = (logsRes.data ?? []) as PRLog[];
      const nextTitles: Record<string, string> = {};
      for (const w of workoutsRes.data ?? []) {
        nextTitles[(w as { id: string }).id] = (w as { title: string }).title;
      }

      setLogs(nextLogs);
      setTitles(nextTitles);
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [userId]);

  const records = useMemo(() => computePersonalRecords(logs, titles), [logs, titles]);
  const prLogIds = useMemo(() => buildPRIdSet(logs), [logs]);

  return { records, prLogIds, loading };
}
