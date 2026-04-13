import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Play, Pause, RotateCcw } from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */
interface WorkoutTimerProps {
  workoutTitle: string;
  workoutDescription: string;
  sectionNames: string[];
  onTimerStop: (time: string) => void;
}

/* ------------------------------------------------------------------ */
/*  Audio helpers                                                      */
/* ------------------------------------------------------------------ */
let audioCtx: AudioContext | null = null;

const getAudioCtx = (): AudioContext => {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
};

const playBeep = (freq: number, durationMs: number, repeats: number) => {
  try {
    const ctx = getAudioCtx();
    for (let i = 0; i < repeats; i++) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      gain.gain.value = 0.35;
      const start = ctx.currentTime + i * (durationMs + 100) / 1000;
      osc.start(start);
      osc.stop(start + durationMs / 1000);
    }
  } catch { /* silent */ }
};

const shortBeeps = () => playBeep(660, 120, 1);
const goBeep = () => playBeep(880, 350, 1);
const finishBeeps = () => playBeep(800, 200, 3);

/* ------------------------------------------------------------------ */
/*  Format helpers                                                     */
/* ------------------------------------------------------------------ */
const fmt = (s: number): string => {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
};

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */
type TimerMode = 'stopwatch' | 'countdown' | 'intervals';
type TimerState = 'idle' | 'preStart' | 'running' | 'paused' | 'finished';
type IntervalPhase = 'work' | 'rest';

const PRE_START_SECONDS = 10;

/* ================================================================== */
/*  Component                                                          */
/* ================================================================== */
const WorkoutTimer = ({ workoutTitle, workoutDescription, sectionNames, onTimerStop }: WorkoutTimerProps) => {

  /* --- Auto-detect mode ------------------------------------------- */
  const detected = useMemo(() => {
    const text = `${workoutTitle} ${workoutDescription} ${sectionNames.join(' ')}`.toLowerCase();
    const timeMatch = text.match(/(\d+)\s*min/i);
    if (text.includes('amrap') && timeMatch) {
      return { mode: 'countdown' as TimerMode, duration: parseInt(timeMatch[1]) * 60 };
    }
    return { mode: 'stopwatch' as TimerMode, duration: 0 };
  }, [workoutTitle, workoutDescription, sectionNames]);

  /* --- Core state ------------------------------------------------- */
  const [mode, setMode] = useState<TimerMode>(detected.mode);
  const [timerState, setTimerState] = useState<TimerState>('idle');
  const [seconds, setSeconds] = useState(0);
  const [preStartCount, setPreStartCount] = useState(PRE_START_SECONDS);

  /* --- Countdown config ------------------------------------------ */
  const [cdMinutes, setCdMinutes] = useState(detected.mode === 'countdown' ? detected.duration / 60 : 10);
  const [cdSeconds, setCdSeconds] = useState(0);

  /* --- Interval config ------------------------------------------- */
  const [workMin, setWorkMin] = useState(0);
  const [workSec, setWorkSec] = useState(30);
  const [restMin, setRestMin] = useState(0);
  const [restSec, setRestSec] = useState(15);
  const [totalRounds, setTotalRounds] = useState(5);
  const [currentRound, setCurrentRound] = useState(1);
  const [phase, setPhase] = useState<IntervalPhase>('work');
  const [phaseTime, setPhaseTime] = useState(0);

  /* --- Refs ------------------------------------------------------ */
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const isActive = timerState === 'preStart' || timerState === 'running';

  /* --- Wake Lock ------------------------------------------------- */
  const acquireWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await navigator.wakeLock.request('screen');
      }
    } catch { /* not supported or denied */ }
  }, []);

  const releaseWakeLock = useCallback(() => {
    wakeLockRef.current?.release().catch(() => {});
    wakeLockRef.current = null;
  }, []);

  /* --- Cleanup --------------------------------------------------- */
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      releaseWakeLock();
    };
  }, [releaseWakeLock]);

  /* --- Clear interval helper ------------------------------------- */
  const clearTick = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  /* --- Computed durations ---------------------------------------- */
  const countdownTotal = cdMinutes * 60 + cdSeconds;
  const workTotal = workMin * 60 + workSec;
  const restTotal = restMin * 60 + restSec;

  /* ================================================================ */
  /*  Pre-start tick                                                   */
  /* ================================================================ */
  const startPreStart = useCallback(() => {
    // Initialize audio context on user gesture
    getAudioCtx();
    acquireWakeLock();

    setPreStartCount(PRE_START_SECONDS);
    setTimerState('preStart');

    let count = PRE_START_SECONDS;
    clearTick();
    intervalRef.current = setInterval(() => {
      count--;
      if (count <= 3 && count > 0) shortBeeps();
      if (count <= 0) {
        goBeep();
        setPreStartCount(0);
        // Will be picked up by effect to start running
      } else {
        setPreStartCount(count);
      }
    }, 1000);
  }, [acquireWakeLock, clearTick]);

  /* Transition from preStart → running when count hits 0 */
  useEffect(() => {
    if (timerState === 'preStart' && preStartCount === 0) {
      clearTick();
      // Initialize running state based on mode
      if (mode === 'stopwatch') {
        setSeconds(0);
      } else if (mode === 'countdown') {
        setSeconds(countdownTotal);
      } else {
        setCurrentRound(1);
        setPhase('work');
        setPhaseTime(workTotal);
        setSeconds(0);
      }
      setTimerState('running');
    }
  }, [timerState, preStartCount, clearTick, mode, countdownTotal, workTotal]);

  /* ================================================================ */
  /*  Main running tick                                                */
  /* ================================================================ */
  useEffect(() => {
    if (timerState !== 'running') return;
    clearTick();

    intervalRef.current = setInterval(() => {
      if (mode === 'stopwatch') {
        setSeconds(p => p + 1);
      } else if (mode === 'countdown') {
        setSeconds(p => {
          if (p <= 1) {
            clearTick();
            finishBeeps();
            releaseWakeLock();
            setTimerState('finished');
            onTimerStop(fmt(countdownTotal));
            return 0;
          }
          return p - 1;
        });
      } else {
        // Interval mode
        setPhaseTime(p => {
          if (p <= 1) {
            // Phase ended
            setPhase(prev => {
              if (prev === 'work') {
                shortBeeps();
                setPhaseTime(restTotal);
                return 'rest';
              } else {
                // Rest ended — next round or finish
                setCurrentRound(r => {
                  if (r >= totalRounds) {
                    clearTick();
                    finishBeeps();
                    releaseWakeLock();
                    setTimerState('finished');
                    onTimerStop(fmt(seconds));
                    return r;
                  }
                  shortBeeps();
                  setPhaseTime(workTotal);
                  return r + 1;
                });
                return 'work';
              }
            });
            return p; // will be overridden by setPhaseTime above
          }
          return p - 1;
        });
        setSeconds(p => p + 1); // total elapsed
      }
    }, 1000);

    return () => clearTick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timerState, mode]);

  /* ================================================================ */
  /*  Actions                                                          */
  /* ================================================================ */
  const handleStart = useCallback(() => {
    if (timerState === 'idle' || timerState === 'finished') {
      startPreStart();
    } else if (timerState === 'paused') {
      setTimerState('running');
    }
  }, [timerState, startPreStart]);

  const handlePause = useCallback(() => {
    if (timerState === 'running') {
      clearTick();
      setTimerState('paused');
    }
  }, [timerState, clearTick]);

  const handleReset = useCallback(() => {
    clearTick();
    releaseWakeLock();
    setTimerState('idle');
    setSeconds(0);
    setPreStartCount(PRE_START_SECONDS);
    setCurrentRound(1);
    setPhase('work');
    setPhaseTime(0);
  }, [clearTick, releaseWakeLock]);

  const handleStop = useCallback(() => {
    clearTick();
    releaseWakeLock();
    const result = mode === 'countdown' ? fmt(countdownTotal - seconds) : fmt(seconds);
    onTimerStop(result);
    setTimerState('finished');
  }, [clearTick, releaseWakeLock, mode, countdownTotal, seconds, onTimerStop]);

  const selectMode = useCallback((m: string) => {
    if (isActive) return;
    setMode(m as TimerMode);
    handleReset();
  }, [isActive, handleReset]);

  /* ================================================================ */
  /*  Display value                                                    */
  /* ================================================================ */
  const displayTime = (() => {
    if (timerState === 'preStart') return String(preStartCount);
    if (mode === 'intervals' && timerState === 'running') return fmt(phaseTime);
    if (mode === 'countdown') return fmt(seconds);
    return fmt(seconds);
  })();

  const isPreStart = timerState === 'preStart';

  /* ================================================================ */
  /*  Clamp helper                                                     */
  /* ================================================================ */
  const clamp = (v: string, min: number, max: number) => Math.max(min, Math.min(max, parseInt(v) || 0));

  /* ================================================================ */
  /*  Render                                                           */
  /* ================================================================ */
  return (
    <div className="flex flex-col items-center gap-3">
      {/* Mode tabs */}
      <Tabs value={mode} onValueChange={selectMode}>
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="stopwatch" disabled={isActive} className="text-xs font-bold tracking-wider uppercase">
            For Time
          </TabsTrigger>
          <TabsTrigger value="countdown" disabled={isActive} className="text-xs font-bold tracking-wider uppercase">
            Countdown
          </TabsTrigger>
          <TabsTrigger value="intervals" disabled={isActive} className="text-xs font-bold tracking-wider uppercase">
            Intervals
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Pre-start overlay text */}
      {isPreStart && (
        <p className="text-xs font-bold text-primary tracking-widest uppercase animate-pulse">
          Starting in…
        </p>
      )}

      {/* Main time display */}
      <p className={`font-mono font-bold tracking-wider text-center transition-all ${
        isPreStart
          ? 'text-7xl text-primary'
          : 'text-6xl text-foreground'
      }`}>
        {displayTime}
      </p>

      {/* Interval round & phase indicator */}
      {mode === 'intervals' && timerState === 'running' && (
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold uppercase tracking-widest px-3 py-1 rounded-md ${
            phase === 'work'
              ? 'bg-primary/15 text-primary'
              : 'bg-accent/15 text-accent'
          }`}>
            {phase === 'work' ? '🔥 Work' : '😮‍💨 Rest'}
          </span>
          <span className="text-sm text-muted-foreground font-body">
            Round {currentRound}/{totalRounds}
          </span>
        </div>
      )}

      {/* Config inputs (idle only) */}
      {timerState === 'idle' && mode === 'countdown' && (
        <div className="flex items-center gap-2">
          <Input type="number" min={0} max={60} value={cdMinutes}
            onChange={e => setCdMinutes(clamp(e.target.value, 0, 60))}
            className="w-16 h-8 text-center text-sm" />
          <span className="text-xs text-muted-foreground">min</span>
          <Input type="number" min={0} max={59} value={cdSeconds}
            onChange={e => setCdSeconds(clamp(e.target.value, 0, 59))}
            className="w-16 h-8 text-center text-sm" />
          <span className="text-xs text-muted-foreground">sec</span>
        </div>
      )}

      {timerState === 'idle' && mode === 'intervals' && (
        <div className="grid grid-cols-2 gap-3 w-full max-w-xs text-center">
          {/* Work */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-body">Work</p>
            <div className="flex items-center justify-center gap-1">
              <Input type="number" min={0} max={60} value={workMin}
                onChange={e => setWorkMin(clamp(e.target.value, 0, 60))}
                className="w-14 h-8 text-center text-sm" />
              <span className="text-[10px] text-muted-foreground">:</span>
              <Input type="number" min={0} max={59} value={workSec}
                onChange={e => setWorkSec(clamp(e.target.value, 0, 59))}
                className="w-14 h-8 text-center text-sm" />
            </div>
          </div>
          {/* Rest */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-body">Rest</p>
            <div className="flex items-center justify-center gap-1">
              <Input type="number" min={0} max={60} value={restMin}
                onChange={e => setRestMin(clamp(e.target.value, 0, 60))}
                className="w-14 h-8 text-center text-sm" />
              <span className="text-[10px] text-muted-foreground">:</span>
              <Input type="number" min={0} max={59} value={restSec}
                onChange={e => setRestSec(clamp(e.target.value, 0, 59))}
                className="w-14 h-8 text-center text-sm" />
            </div>
          </div>
          {/* Rounds */}
          <div className="col-span-2">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-body">Rounds</p>
            <Input type="number" min={1} max={99} value={totalRounds}
              onChange={e => setTotalRounds(clamp(e.target.value, 1, 99))}
              className="w-16 h-8 text-center text-sm mx-auto" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-2">
        {(timerState === 'idle' || timerState === 'finished') && (
          <Button size="sm" onClick={handleStart} className="gap-1.5">
            <Play className="h-4 w-4" /> Start
          </Button>
        )}
        {timerState === 'paused' && (
          <Button size="sm" onClick={handleStart} className="gap-1.5">
            <Play className="h-4 w-4" /> Resume
          </Button>
        )}
        {timerState === 'running' && (
          <>
            <Button size="sm" variant="outline" onClick={handlePause} className="gap-1.5">
              <Pause className="h-4 w-4" /> Pause
            </Button>
            <Button size="sm" variant="destructive" onClick={handleStop} className="gap-1.5">
              Stop
            </Button>
          </>
        )}
        {isPreStart && (
          <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
            Cancel
          </Button>
        )}
        {(timerState === 'paused' || timerState === 'finished') && (
          <Button size="sm" variant="outline" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-4 w-4" /> Reset
          </Button>
        )}
      </div>

      {/* Finished state */}
      {timerState === 'finished' && (
        <p className="text-xs text-primary font-bold tracking-widest uppercase animate-pulse">
          🔥 Time!
        </p>
      )}
    </div>
  );
};

export default WorkoutTimer;
