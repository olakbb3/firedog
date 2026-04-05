import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Square, RotateCcw } from 'lucide-react';

interface WorkoutTimerProps {
  workoutTitle: string;
  workoutDescription: string;
  sectionNames: string[];
  onTimerStop: (time: string) => void;
}

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
  const [seconds, setSeconds] = useState(detected.type === 'countdown' ? detected.duration : 0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup on unmount
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
    intervalRef.current = setInterval(() => {
      setSeconds(prev => {
        if (mode === 'countdown') {
          if (prev <= 1) {
            stop();
            onTimerStop(formatTime(detected.duration));
            return 0;
          }
          return prev - 1;
        }
        return prev + 1;
      });
    }, 1000);
  }, [isRunning, mode, stop, onTimerStop, detected.duration]);

  const handleStop = useCallback(() => {
    stop();
    const result = mode === 'countdown'
      ? formatTime(detected.duration - seconds)
      : formatTime(seconds);
    onTimerStop(result);
  }, [stop, mode, seconds, detected.duration, onTimerStop]);

  const reset = useCallback(() => {
    stop();
    setSeconds(mode === 'countdown' ? detected.duration : 0);
  }, [stop, mode, detected.duration]);

  const toggleMode = useCallback(() => {
    stop();
    if (mode === 'stopwatch' && detected.type === 'countdown') {
      setMode('countdown');
      setSeconds(detected.duration);
    } else if (mode === 'countdown') {
      setMode('stopwatch');
      setSeconds(0);
    } else {
      // No countdown available, stay on stopwatch
      setSeconds(0);
    }
  }, [stop, mode, detected]);

  const modeLabel = mode === 'countdown'
    ? `AMRAP (${formatTime(detected.duration)})`
    : 'For Time';

  return (
    <div className="mt-4 mb-2 flex flex-col items-center gap-3 border-t border-border pt-4">
      {/* Timer display */}
      <p className="font-mono text-5xl font-bold text-foreground tracking-wider">
        {formatTime(seconds)}
      </p>

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

      {/* Mode label */}
      <button
        onClick={toggleMode}
        className="text-[10px] text-muted-foreground uppercase tracking-widest font-body hover:text-foreground transition-colors"
      >
        Mode: {modeLabel}
      </button>
    </div>
  );
};

export default WorkoutTimer;
