/**
 * Personal Record detection utility.
 * Read-only: compares a log against prior logs for the same workout + result_type.
 */

export interface PRLog {
  id?: string;
  workout_id: string;
  workout_section_id?: string | null;
  result_type?: string | null;
  weight?: number | null;
  time?: string | null;
  rounds?: number | null;
  reps?: number | null;
}

const timeToSeconds = (t: string): number => {
  if (!t) return Infinity;
  const parts = t.split(':').map(Number);
  if (parts.some(isNaN)) return Infinity;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] || Infinity;
};

export const isPersonalRecord = (log: PRLog, allLogs: PRLog[]): boolean => {
  if (!log || !log.result_type || log.result_type === 'completed') return false;

  const sameTypeLogs = allLogs.filter(
    (l) =>
      l.result_type === log.result_type &&
      l.workout_id === log.workout_id &&
      (log.workout_section_id ? l.workout_section_id === log.workout_section_id : true) &&
      l.id !== log.id
  );

  if (log.result_type === 'weight') {
    if (log.weight == null) return false;
    if (sameTypeLogs.length === 0) return true;
    const max = Math.max(...sameTypeLogs.map((l) => l.weight ?? 0));
    return (log.weight ?? 0) > max;
  }

  if (log.result_type === 'time') {
    if (!log.time) return false;
    if (sameTypeLogs.length === 0) return true;
    const current = timeToSeconds(log.time);
    if (!isFinite(current)) return false;
    const min = Math.min(...sameTypeLogs.map((l) => timeToSeconds(l.time || '')));
    return current < min;
  }

  if (log.result_type === 'rounds_reps') {
    const score = (l: PRLog) => (l.rounds || 0) * 1000 + (l.reps || 0);
    const current = score(log);
    if (current === 0) return false;
    if (sameTypeLogs.length === 0) return true;
    const max = Math.max(...sameTypeLogs.map(score));
    return current > max;
  }

  if (log.result_type === 'calories') {
    if (log.weight == null && (log as any).calories == null) return false;
    const cur = (log as any).calories ?? 0;
    if (sameTypeLogs.length === 0) return cur > 0;
    const max = Math.max(...sameTypeLogs.map((l) => (l as any).calories ?? 0));
    return cur > max;
  }

  if (log.result_type === 'meters') {
    const cur = (log as any).meters ?? 0;
    if (sameTypeLogs.length === 0) return cur > 0;
    const max = Math.max(...sameTypeLogs.map((l) => (l as any).meters ?? 0));
    return cur > max;
  }

  return false;
};
