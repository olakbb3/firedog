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

export const useLeaderboard = (workoutId: string | undefined, sections: WorkoutSection[]) => {
  const [crew, setCrew] = useState<CrewEntry[]>([]);

  useEffect(() => {
    if (!workoutId) return;

    const fetchLeaderboard = async () => {
      // Find "First-In" section IDs for this workout
      const firstInSectionIds: string[] = [];
      for (const s of sections) {
        if (s.section_name.toLowerCase().includes('first-in') || s.section_name.toLowerCase().includes('first in')) {
          firstInSectionIds.push(s.id);
        }
      }

      // Today's date range (UTC)
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

      // Filter to First-In sections if they exist
      if (firstInSectionIds.length > 0) {
        query = query.in('workout_section_id', firstInSectionIds);
      }

      const { data: crewLogs } = await query;

      if (crewLogs && crewLogs.length > 0) {
        // Deduplicate: keep latest log per user
        const latestByUser = new Map<string, typeof crewLogs[0]>();
        for (const log of crewLogs) {
          if (!latestByUser.has(log.user_id)) {
            latestByUser.set(log.user_id, log);
          }
        }

        // Sort by result_type: time → ascending, reps/rounds/calories/meters/weight → descending
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
  }, [workoutId, sections]);

  return { crew };
};
