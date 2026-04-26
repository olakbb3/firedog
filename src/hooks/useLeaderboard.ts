import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { WorkoutSection } from '@/types/index';

export interface AthleteAffiliationLite {
  gym_affiliation?: string | null;
  fd_affiliation?: string | null;
  fd_career_volunteer?: string | null;
}

export interface CrewEntry {
  user_id: string;
  user_name: string;
  result: string;
  result_type: string;
  is_rx: boolean;
  affiliation?: AthleteAffiliationLite;
}

const formatCrewResult = (log: { result_type: string; time?: string | null; rounds?: number | null; reps?: number | null; calories?: number | null; meters?: number | null; weight?: number | null }): string => {
  switch (log.result_type) {
    case 'time': return log.time || 'Timed';
    case 'rounds_reps': {
      const parts: string[] = [];
      if (log.rounds !== null && log.rounds !== undefined) parts.push(`${log.rounds} Rounds`);
      if (log.reps !== null && log.reps !== undefined) parts.push(`${log.reps} Reps`);
      return parts.join(' + ') || 'Logged';
    }
    case 'calories': return log.calories != null ? `${log.calories} cal` : 'Logged';
    case 'meters': return log.meters != null ? `${log.meters} m` : 'Logged';
    case 'weight': return log.weight != null ? `${log.weight} lbs` : 'Logged';
    case 'completed': return 'Completed';
    default: return 'Logged';
  }
};

export const useLeaderboard = (workoutId: string | undefined, sections: WorkoutSection[], isFiredogTotal = false) => {
  const [crew, setCrew] = useState<CrewEntry[]>([]);
  const [rawLogs, setRawLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshIndex, setRefreshIndex] = useState(0);

  useEffect(() => {
    if (!workoutId || !isFiredogTotal) return;
    const interval = window.setInterval(() => {
      if (!document.hidden) setRefreshIndex(i => i + 1);
    }, 60000);
    return () => window.clearInterval(interval);
  }, [workoutId, isFiredogTotal]);

  useEffect(() => {
    if (!workoutId) return;

    const fetchLeaderboard = async () => {
      setLoading(true);
      if (isFiredogTotal) {
        await fetchFiredogTotalLeaderboard();
      } else {
        await fetchStandardLeaderboard();
      }
      setLoading(false);
    };

    const fetchFiredogTotalLeaderboard = async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const { data: firedogChallenge } = await supabase
        .from('challenges')
        .select('id')
        .eq('title', 'FIREDOG TOTAL')
        .lte('start_date', monthStart.toLocaleDateString('en-CA'))
        .gte('end_date', new Date(now.getFullYear(), now.getMonth(), now.getDate()).toLocaleDateString('en-CA'))
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!firedogChallenge) {
        setCrew([]);
        setRawLogs([]);
        return;
      }

      const { data: logs } = await supabase.rpc('get_leaderboard_logs', {
        _workout_id: firedogChallenge.id,
        _section_id: null,
        _from: monthStart.toISOString(),
        _to: monthEnd.toISOString(),
        _weight_only: true,
      });

      if (!logs || logs.length === 0) {
        setCrew([]);
        setRawLogs([]);
        return;
      }

      const nameMap = new Map<string, string>((logs || []).map(p => [p.user_id, p.user_name || 'Athlete']));
      const affMap = new Map<string, AthleteAffiliationLite>(
        (logs || []).map(p => [p.user_id, {
          gym_affiliation: (p as any).gym_affiliation,
          fd_affiliation: (p as any).fd_affiliation,
          fd_career_volunteer: (p as any).fd_career_volunteer,
        }])
      );

      // Attach names to logs
      const logsWithNames = logs.map(log => ({
        ...log,
        user_name: nameMap.get(log.user_id) || 'Athlete'
      }));
      setRawLogs(logsWithNames);

      // Group by user, then by section, keep max weight per section
      const userSections = new Map<string, Map<string, { weight: number; is_rx: boolean }>>();

      for (const log of logs) {
        if (!log.workout_section_id || log.weight == null) continue;

        if (!userSections.has(log.user_id)) {
          userSections.set(log.user_id, new Map());
        }
        const sectionMap = userSections.get(log.user_id)!;
        const existing = sectionMap.get(log.workout_section_id);

        if (!existing || log.weight > existing.weight) {
          sectionMap.set(log.workout_section_id, { weight: log.weight, is_rx: log.is_rx ?? true });
        }
      }

      // Sum max weights per user
      const userTotals: { user_id: string; total: number; allRx: boolean }[] = [];
      for (const [userId, sectionMap] of userSections) {
        let total = 0;
        let allRx = true;
        for (const entry of sectionMap.values()) {
          total += entry.weight;
          if (!entry.is_rx) allRx = false;
        }
        userTotals.push({ user_id: userId, total, allRx });
      }

      // Sort descending by total
      userTotals.sort((a, b) => b.total - a.total);

      const entries: CrewEntry[] = userTotals.slice(0, 10).map(u => ({
        user_id: u.user_id,
        user_name: nameMap.get(u.user_id) || 'Athlete',
        result: `${u.total} lbs`,
        result_type: 'weight',
        is_rx: u.allRx,
        affiliation: affMap.get(u.user_id),
      }));


      setCrew(entries);
    };

    const fetchStandardLeaderboard = async () => {
      // Exclude per_exercise and completed-only sections from leaderboard
      const leaderboardSections = sections.filter(s => {
        const mode = s.input_mode || 'single';
        return mode !== 'per_exercise' && s.result_type !== 'completed';
      });

      const firstInSectionIds: string[] = [];
      for (const s of leaderboardSections) {
        if (s.section_name.toLowerCase().includes('first-in') || s.section_name.toLowerCase().includes('first in')) {
          firstInSectionIds.push(s.id);
        }
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const todayEnd = new Date();
      todayEnd.setHours(23, 59, 59, 999);

      const fetchLogsForSection = (sectionId: string | null) => supabase.rpc('get_leaderboard_logs', {
        _workout_id: workoutId,
        _section_id: sectionId,
        _from: todayStart.toISOString(),
        _to: todayEnd.toISOString(),
        _weight_only: false,
      });
      const logResults = firstInSectionIds.length > 0
        ? await Promise.all(firstInSectionIds.map(sectionId => fetchLogsForSection(sectionId)))
        : [await fetchLogsForSection(null)];
      const crewLogs = logResults.flatMap(res => res.data || [])
        .sort((a, b) => new Date(b.completion_date || 0).getTime() - new Date(a.completion_date || 0).getTime())
        .slice(0, 50);

      if (crewLogs && crewLogs.length > 0) {
        const latestByUser = new Map<string, typeof crewLogs[0]>();
        for (const log of crewLogs) {
          if (!latestByUser.has(log.user_id)) {
            latestByUser.set(log.user_id, log);
          }
        }

        const sorted = Array.from(latestByUser.values()).sort((a, b) => {
          if (a.result_type === 'time' && b.result_type === 'time') {
            return (a.time || '99:99').localeCompare(b.time || '99:99');
          }
          if (a.result_type === 'rounds_reps' && b.result_type === 'rounds_reps') {
            const aVal = (a.rounds || 0) * 1000 + (a.reps || 0);
            const bVal = (b.rounds || 0) * 1000 + (b.reps || 0);
            return bVal - aVal;
          }
          if (a.result_type === 'calories' && b.result_type === 'calories') return (b.calories || 0) - (a.calories || 0);
          if (a.result_type === 'meters' && b.result_type === 'meters') return (b.meters || 0) - (a.meters || 0);
          if (a.result_type === 'weight' && b.result_type === 'weight') return (b.weight || 0) - (a.weight || 0);
          return 0;
        });

        const nameMap = new Map<string, string>((sorted || []).map(p => [p.user_id, p.user_name || 'Athlete']));
        const affMap = new Map<string, AthleteAffiliationLite>(
          (sorted || []).map(p => [p.user_id, {
            gym_affiliation: (p as any).gym_affiliation,
            fd_affiliation: (p as any).fd_affiliation,
            fd_career_volunteer: (p as any).fd_career_volunteer,
          }])
        );

        const entries: CrewEntry[] = sorted.slice(0, 10).map(log => ({
          user_id: log.user_id,
          user_name: nameMap.get(log.user_id) || 'Athlete',
          result: formatCrewResult(log),
          result_type: log.result_type || 'completed',
          is_rx: log.is_rx ?? true,
          affiliation: affMap.get(log.user_id),
        }));
        setCrew(entries);
      } else {
        setCrew([]);
      }
    };

    fetchLeaderboard();
  }, [workoutId, sections, isFiredogTotal, refreshIndex]);

  return { crew, rawLogs, loading };
};
