import { describe, it, expect } from 'vitest';
import {
  evaluatePRBatch,
  isPersonalRecord,
  timeToSeconds,
  type PRLog,
  type PRCandidate,
} from './personalRecords';

const makeLog = (overrides: Partial<PRLog>): PRLog => ({
  workout_id: 'w1',
  workout_section_id: 's1',
  result_type: 'weight',
  ...overrides,
});

describe('personalRecords', () => {
  describe('timeToSeconds', () => {
    it('parses MM:SS', () => {
      expect(timeToSeconds('3:45')).toBe(225);
    });
    it('parses HH:MM:SS', () => {
      expect(timeToSeconds('1:00:00')).toBe(3600);
    });
    it('returns Infinity on bad input', () => {
      expect(timeToSeconds('')).toBe(Infinity);
      expect(timeToSeconds('abc')).toBe(Infinity);
    });
  });

  describe('isPersonalRecord — weight (strength)', () => {
    const prior: PRLog[] = [
      makeLog({ id: 'a', exercise_name: 'Back Squat', weight: 300 }),
      makeLog({ id: 'b', exercise_name: 'Back Squat', weight: 280 }),
    ];

    it('worse score → no PR', () => {
      const log = makeLog({ exercise_name: 'Back Squat', weight: 250 });
      expect(isPersonalRecord(log, prior)).toBe(false);
    });

    it('same score → no PR', () => {
      const log = makeLog({ exercise_name: 'Back Squat', weight: 300 });
      expect(isPersonalRecord(log, prior)).toBe(false);
    });

    it('better score → PR', () => {
      const log = makeLog({ exercise_name: 'Back Squat', weight: 315 });
      expect(isPersonalRecord(log, prior)).toBe(true);
    });

    it('fresh user first log → PR', () => {
      const log = makeLog({ exercise_name: 'Back Squat', weight: 100 });
      expect(isPersonalRecord(log, [])).toBe(true);
    });

    it('null/zero score → no PR', () => {
      expect(
        isPersonalRecord(
          makeLog({ exercise_name: 'Back Squat', weight: 0 }),
          prior
        )
      ).toBe(false);
      expect(
        isPersonalRecord(
          makeLog({ exercise_name: 'Back Squat', weight: null }),
          prior
        )
      ).toBe(false);
    });
  });

  describe('isPersonalRecord — time (lower is better)', () => {
    const prior: PRLog[] = [
      makeLog({ id: 'a', result_type: 'time', time: '5:00' }),
      makeLog({ id: 'b', result_type: 'time', time: '4:30' }),
    ];

    it('slower time → no PR', () => {
      expect(
        isPersonalRecord(makeLog({ result_type: 'time', time: '5:30' }), prior)
      ).toBe(false);
    });

    it('faster time → PR', () => {
      expect(
        isPersonalRecord(makeLog({ result_type: 'time', time: '4:00' }), prior)
      ).toBe(true);
    });

    it('empty time → no PR, no crash', () => {
      expect(
        isPersonalRecord(makeLog({ result_type: 'time', time: '' }), prior)
      ).toBe(false);
    });
  });

  describe('isPersonalRecord — rest day / completed', () => {
    it('completed log → never a PR', () => {
      const log = makeLog({ result_type: 'completed' });
      expect(isPersonalRecord(log, [])).toBe(false);
    });
  });

  describe('evaluatePRBatch — single submission, multiple movements', () => {
    it('3 exercises, 1 PR → one item naming that movement', () => {
      const prior: PRLog[] = [
        makeLog({ id: '1', exercise_name: 'Back Squat', weight: 300 }),
        makeLog({ id: '2', exercise_name: 'Bench Press', weight: 200 }),
        makeLog({ id: '3', exercise_name: 'Deadlift', weight: 400 }),
      ];
      const candidates: PRCandidate[] = [
        {
          label: 'Back Squat',
          log: makeLog({ exercise_name: 'Back Squat', weight: 290 }),
        },
        {
          label: 'Bench Press',
          log: makeLog({ exercise_name: 'Bench Press', weight: 210 }),
        },
        {
          label: 'Deadlift',
          log: makeLog({ exercise_name: 'Deadlift', weight: 395 }),
        },
      ];
      const { hasPR, prItems } = evaluatePRBatch(candidates, prior);
      expect(hasPR).toBe(true);
      expect(prItems).toEqual(['Bench Press']);
    });

    it('all worse → no PR, no items', () => {
      const prior: PRLog[] = [
        makeLog({ id: '1', exercise_name: 'Back Squat', weight: 300 }),
      ];
      const candidates: PRCandidate[] = [
        {
          label: 'Back Squat',
          log: makeLog({ exercise_name: 'Back Squat', weight: 250 }),
        },
      ];
      const { hasPR, prItems } = evaluatePRBatch(candidates, prior);
      expect(hasPR).toBe(false);
      expect(prItems).toHaveLength(0);
    });

    it('candidate is never compared against itself (pre-insert dataset)', () => {
      // The submitted log is NOT in priorLogs. First-ever log must PR.
      const candidates: PRCandidate[] = [
        {
          label: 'Snatch',
          log: makeLog({ exercise_name: 'Snatch', weight: 135 }),
        },
      ];
      const { hasPR, prItems } = evaluatePRBatch(candidates, []);
      expect(hasPR).toBe(true);
      expect(prItems).toEqual(['Snatch']);
    });
  });
});
