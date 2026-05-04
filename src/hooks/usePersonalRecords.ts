import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
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
        supabase
          .from('workout_logs')
          .select(
            'id, workout_id, workout_section_id, movement_id, movements(id, name, category), exercise_name, result_type, weight, time, rounds, reps, calories, meters, is_rx, completion_date'
          )
          .eq('user_id', userId)
          .order('completion_date', { ascending: false }),
        supabase.from('workouts').select('id, title'),
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
