import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { WorkoutSection } from '@/types/index';

export interface CrewEntry {
  user_name: string;
  result: string;
  result_type: string;
  is_rx: boolean;
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

  useEffect(() => {
    if (!workoutId) return;

    const fetchLeaderboard = async () => {
      if (isFiredogTotal) {
        await fetchFiredogTotalLeaderboard();
      } else {
        await fetchStandardLeaderboard();
      }
    };

    const fetchFiredogTotalLeaderboard = async () => {
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

      const { data: logs } = await supabase
        .from('workout_logs')
        .select('user_id, workout_section_id, weight, is_rx, completion_date')
        .eq('workout_id', workoutId)
        .gte('completion_date', monthStart.toISOString())
        .lt('completion_date', monthEnd.toISOString())
        .not('weight', 'is', null);

      if (!logs || logs.length === 0) {
        setCrew([]);
        setRawLogs([]);
        return;
      }

      // Fetch user names for rawLogs
      const allUserIds = [...new Set(logs.map(l => l.user_id))];
      const { data: allProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', allUserIds);

      const nameMap = new Map((allProfiles || []).map(p => [p.id, p.full_name || 'Athlete']));

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
        user_name: nameMap.get(u.user_id) || 'Athlete',
        result: `${u.total} lbs`,
        result_type: 'weight',
        is_rx: u.allRx,
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

      let query = supabase
        .from('workout_logs')
        .select('user_id, result_type, time, rounds, reps, calories, meters, weight, is_rx, completion_date')
        .eq('workout_id', workoutId)
        .gte('completion_date', todayStart.toISOString())
        .lte('completion_date', todayEnd.toISOString())
        .order('completion_date', { ascending: false })
        .limit(50);

      if (firstInSectionIds.length > 0) {
        query = query.in('workout_section_id', firstInSectionIds);
      }

      const { data: crewLogs } = await query;

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

        const userIds = sorted.map(l => l.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const nameMap = new Map((profiles || []).map(p => [p.id, p.full_name || 'Athlete']));

        const entries: CrewEntry[] = sorted.slice(0, 10).map(log => ({
          user_name: nameMap.get(log.user_id) || 'Athlete',
          result: formatCrewResult(log),
          result_type: log.result_type || 'completed',
          is_rx: log.is_rx ?? true,
        }));
        setCrew(entries);
      } else {
        setCrew([]);
      }
    };

    fetchLeaderboard();
  }, [workoutId, sections, isFiredogTotal]);

  return { crew, rawLogs };
};
