/**
 * PR Engine — Single Source of Truth.
 *
 * All Personal Record computation lives here. UI components and hooks must
 * consume the helpers below; never re-implement scoring or comparisons.
 *
 * Read-only: no DB writes, no schema dependencies beyond workout_logs columns.
 */

export type PRResultType =
  | 'completed'
  | 'time'
  | 'rounds_reps'
  | 'calories'
  | 'meters'
  | 'weight';

export interface PRLog {
  id?: string;
  workout_id: string;
  workout_section_id?: string | null;
  exercise_name?: string | null;
  result_type?: PRResultType | string | null;
  weight?: number | null;
  time?: string | null;
  rounds?: number | null;
  reps?: number | null;
  calories?: number | null;
  meters?: number | null;
  is_rx?: boolean | null;
  notes?: string | null;
  completion_date?: string;
}

export interface PRCandidate {
  /** Display label for the toast / badge (movement or workout title). */
  label: string;
  log: PRLog;
}

export interface PRResult {
  hasPR: boolean;
  /** Labels of items that became a new PR in this submission. */
  prItems: string[];
}

export interface PersonalRecord {
  id: string;
  movement_name: string;
  category: 'strength' | 'wod' | 'cardio';
  result_type: 'weight' | 'time' | 'rounds_reps' | 'calories' | 'meters';
  pr_value: string;
  raw_value: number;
  date_achieved: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Time normalization (standard).
// ─────────────────────────────────────────────────────────────────────────────
export const timeToSeconds = (time: string | null | undefined): number => {
  if (!time) return Infinity;
  const parts = time.split(':').map(Number);
  if (parts.some((n) => Number.isNaN(n))) return Infinity;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return parts[0] || Infinity;
};

const roundsRepsScore = (l: PRLog): number =>
  (l.rounds ?? 0) * 1000 + (l.reps ?? 0);

const rawValue = (l: PRLog): number => {
  switch (l.result_type) {
    case 'weight':
      return l.weight ?? 0;
    case 'time':
      return timeToSeconds(l.time ?? '');
    case 'rounds_reps':
      return roundsRepsScore(l);
    case 'calories':
      return l.calories ?? 0;
    case 'meters':
      return l.meters ?? 0;
    default:
      return 0;
  }
};

/**
 * For a given result_type, return whether `a` is a strictly better score than `b`.
 */
const isBetter = (a: PRLog, b: PRLog): boolean => {
  if (a.result_type !== b.result_type) return false;
  if (a.result_type === 'time') return rawValue(a) < rawValue(b);
  return rawValue(a) > rawValue(b);
};

/**
 * Grouping key for PR comparisons.
 *
 * Strength (weight) groups by exercise_name (per-movement PRs).
 * Everything else groups by workout_id + section + result_type.
 */
const groupKey = (l: PRLog): string => {
  const rt = l.result_type ?? '';
  if (rt === 'weight' && l.exercise_name) {
    return `weight::${l.exercise_name.trim().toLowerCase()}`;
  }
  return `${rt}::${l.workout_id}::${l.workout_section_id ?? ''}`;
};

const isScoreable = (l: PRLog): boolean => {
  if (!l.result_type || l.result_type === 'completed') return false;
  switch (l.result_type) {
    case 'weight':
      return (l.weight ?? 0) > 0;
    case 'time':
      return Number.isFinite(timeToSeconds(l.time ?? ''));
    case 'rounds_reps':
      return roundsRepsScore(l) > 0;
    case 'calories':
      return (l.calories ?? 0) > 0;
    case 'meters':
      return (l.meters ?? 0) > 0;
    default:
      return false;
  }
};

/**
 * Returns true if `log` is a personal record vs. the rest of `allLogs`.
 *
 * "Best" semantics depend on result_type. A first-ever scoreable entry counts
 * as a PR.
 */
export const isPersonalRecord = (log: PRLog, allLogs: PRLog[]): boolean => {
  if (!isScoreable(log)) return false;
  const key = groupKey(log);
  const peers = allLogs.filter(
    (l) => l !== log && l.id !== log.id && groupKey(l) === key && isScoreable(l)
  );
  if (peers.length === 0) return true;
  return peers.every((p) => isBetter(log, p));
};

/**
 * Evaluate an entire submission batch in ONE pass.
 *
 * Pass the candidate logs from this submission plus the user's prior logs
 * (anything older than the submission). Returns a single PRResult that the
 * UI uses for both the toast and any inline indicators.
 */
export const evaluatePRBatch = (
  candidates: PRCandidate[],
  priorLogs: PRLog[]
): PRResult => {
  const prItems: string[] = [];
  const seen = new Set<string>();

  for (const c of candidates) {
    if (!isScoreable(c.log)) continue;
    if (!isPersonalRecord(c.log, priorLogs)) continue;
    if (seen.has(c.label)) continue;
    seen.add(c.label);
    prItems.push(c.label);
  }

  return { hasPR: prItems.length > 0, prItems };
};

// ─────────────────────────────────────────────────────────────────────────────
// Hook-side helpers: compute the user's best record per group.
// ─────────────────────────────────────────────────────────────────────────────

const formatPRValue = (l: PRLog): string => {
  switch (l.result_type) {
    case 'weight':
      return `${l.weight} lbs`;
    case 'time':
      return l.time ?? '—';
    case 'rounds_reps': {
      const r = l.rounds ?? 0;
      const reps = l.reps ?? 0;
      return reps > 0 ? `${r}R+${reps}r` : `${r}R`;
    }
    case 'calories':
      return `${l.calories} cals`;
    case 'meters':
      return `${l.meters} m`;
    default:
      return '—';
  }
};

const categoryFor = (rt: PRLog['result_type']): PersonalRecord['category'] => {
  if (rt === 'weight') return 'strength';
  if (rt === 'calories' || rt === 'meters') return 'cardio';
  return 'wod';
};

/**
 * Compute the set of best logs per group key. Used by usePersonalRecords.
 * Returns one PersonalRecord per group, sorted by date_achieved desc.
 */
export const computePersonalRecords = (
  logs: PRLog[],
  workoutTitles: Record<string, string> = {}
): PersonalRecord[] => {
  const bestByKey = new Map<string, PRLog>();

  for (const l of logs) {
    if (!isScoreable(l)) continue;
    const key = groupKey(l);
    const current = bestByKey.get(key);
    if (!current || isBetter(l, current)) {
      bestByKey.set(key, l);
    }
  }

  const records: PersonalRecord[] = [];
  for (const [, best] of bestByKey) {
    const rt = best.result_type as PersonalRecord['result_type'];
    if (rt === 'completed') continue;
    records.push({
      id: best.id ?? `${groupKey(best)}`,
      movement_name:
        best.exercise_name?.trim() ||
        workoutTitles[best.workout_id] ||
        'Workout',
      category: categoryFor(best.result_type),
      result_type: rt,
      pr_value: formatPRValue(best),
      raw_value: rawValue(best),
      date_achieved: best.completion_date ?? '',
    });
  }

  records.sort((a, b) => (a.date_achieved < b.date_achieved ? 1 : -1));
  return records;
};

/**
 * Quick lookup: is THIS log id one of the user's PRs across their history?
 */
export const buildPRIdSet = (logs: PRLog[]): Set<string> => {
  const bestByKey = new Map<string, PRLog>();
  for (const l of logs) {
    if (!isScoreable(l) || !l.id) continue;
    const key = groupKey(l);
    const current = bestByKey.get(key);
    if (!current || isBetter(l, current)) bestByKey.set(key, l);
  }
  const ids = new Set<string>();
  for (const [, best] of bestByKey) if (best.id) ids.add(best.id);
  return ids;
};
