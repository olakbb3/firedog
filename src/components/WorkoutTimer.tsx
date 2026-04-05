import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Square, RotateCcw } from 'lucide-react';

interface WorkoutTimerProps {
  workoutTitle: string;
  workoutDescription: string;
  sectionNames: string[];
  onTimerStop: (time: string) => void;
}

/* ---- Audio & Haptic helpers ---- */
let audioCtx: AudioContext | null = null;

const getAudioCtx = (): AudioContext | null => {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    return audioCtx;
  } catch { return null; }
};

const playBeep = (freq: number, durationMs: number, repeats: number) => {
  const ctx = getAudioCtx();
  if (!ctx) return;
  for (let i = 0; i < repeats; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = freq;
    gain.gain.value = 0.3;
    const start = ctx.currentTime + i * (durationMs + 100) / 1000;
    osc.start(start);
    osc.stop(start + durationMs / 1000);
  }
};

const triggerVibration = (pattern: number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    navigator.vibrate(pattern);
  }
};

type TimerMode = 'stopwatch' | 'countdown';

const formatTime = (totalSeconds: number): string => {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

const WorkoutTimer = ({ workoutTitle, workoutDescription, sectionNames, onTimerStop }: WorkoutTimerProps) => {
  const detected = useMemo(() => {
    const text = `${workoutTitle} ${workoutDescription} ${sectionNames.join(' ')}`.toLowerCase();
    const timeMatch = text.match(/(\d+)\s*min/i);

    if (text.includes('amrap') && timeMatch) {
      return { type: 'countdown' as TimerMode, duration: parseInt(timeMatch[1]) * 60 };
    }
    return { type: 'stopwatch' as TimerMode, duration: 0 };
  }, [workoutTitle, workoutDescription, sectionNames]);

  const [mode, setMode] = useState<TimerMode>(detected.type);
  const [customMinutes, setCustomMinutes] = useState<number>(
    detected.type === 'countdown' ? detected.duration / 60 : 10
  );
  const [seconds, setSeconds] = useState(detected.type === 'countdown' ? detected.duration : 0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const countdownDuration = mode === 'countdown' ? customMinutes * 60 : 0;

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsRunning(false);
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;
    setIsRunning(true);
    playBeep(600, 150, 1);
    triggerVibration([100]);
    const dur = customMinutes * 60;
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (mode === 'countdown') {
          if (prev <= 1) {
            stop();
            onTimerStop(formatTime(dur));
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);
  }, [isRunning, mode, stop, onTimerStop, customMinutes]);

  const handleStop = useCallback(() => {
    stop();
    const dur = customMinutes * 60;
    const result = mode === 'countdown'
      ? formatTime(dur - seconds)
      : formatTime(seconds);
    onTimerStop(result);
  }, [stop, mode, seconds, customMinutes, onTimerStop]);

  const reset = useCallback(() => {
    stop();
    setSeconds(mode === 'countdown' ? customMinutes * 60 : 0);
  }, [stop, mode, customMinutes]);

  const selectMode = useCallback((newMode: TimerMode) => {
    if (isRunning) return;
    stop();
    setMode(newMode);
    if (newMode === 'countdown') {
      setSeconds(customMinutes * 60);
    } else {
      setSeconds(0);
    }
  }, [isRunning, stop, customMinutes]);

  const handleMinutesChange = (val: string) => {
    const n = Math.max(1, Math.min(60, parseInt(val) || 1));
    setCustomMinutes(n);
    if (!isRunning) setSeconds(n * 60);
  };

  return (
    <div className="mt-4 mb-2 flex flex-col items-center gap-3 border-t border-border pt-4">
      {/* Mode selector */}
      <div className="flex rounded-md overflow-hidden border border-border">
        <button
          onClick={() => selectMode('stopwatch')}
          disabled={isRunning}
          className={`px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors ${
            mode === 'stopwatch'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:text-foreground'
          } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          For Time
        </button>
        <button
          onClick={() => selectMode('countdown')}
          disabled={isRunning}
          className={`px-4 py-1.5 text-xs font-bold tracking-widest uppercase transition-colors border-l border-border ${
            mode === 'countdown'
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-muted-foreground hover:text-foreground'
          } ${isRunning ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          Countdown
        </button>
      </div>

      {/* Timer display */}
      <p className="font-mono text-5xl font-bold text-foreground tracking-wider">
        {formatTime(seconds)}
      </p>

      {/* Duration input (countdown only, when stopped) */}
      {mode === 'countdown' && !isRunning && (
        <div className="flex items-center gap-2">
          <Input
            type="number"
            min={1}
            max={60}
            value={customMinutes}
            onChange={(e) => handleMinutesChange(e.target.value)}
            className="w-16 h-8 text-center text-sm"
          />
          <span className="text-xs text-muted-foreground font-body">min</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2">
        {!isRunning ? (
          <Button size="sm" onClick={start} className="gap-1.5">
            <Play className="h-4 w-4" /> Start
          </Button>
        ) : (
          <Button size="sm" variant="destructive" onClick={handleStop} className="gap-1.5">
            <Square className="h-4 w-4" /> Stop
          </Button>
        )}
        <Button size="sm" variant="outline" onClick={reset} className="gap-1.5">
          <RotateCcw className="h-4 w-4" /> Reset
        </Button>
      </div>
    </div>
  );
};

export default WorkoutTimer;
