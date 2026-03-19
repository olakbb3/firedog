import { useRef, useEffect } from 'react';
import { format, addDays, subDays, isToday, isSameDay } from 'date-fns';

interface WeeklyDateStripProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
}

const WeeklyDateStrip = ({ selectedDate, onDateSelect }: WeeklyDateStripProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayRef = useRef<HTMLButtonElement>(null);

  // Generate 21 days: 10 past + today + 10 future
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Array.from({ length: 21 }, (_, i) => addDays(subDays(today, 10), i));

  useEffect(() => {
    todayRef.current?.scrollIntoView({ inline: 'center', behavior: 'smooth' });
  }, []);

  return (
    <div className="mb-4">
      <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
        {days.map((day) => {
          const selected = isSameDay(day, selectedDate);
          const todayDay = isToday(day);
          return (
            <button
              key={day.toISOString()}
              ref={todayDay ? todayRef : undefined}
              onClick={() => onDateSelect(day)}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 min-w-[3.5rem] transition-all shrink-0 ${
                selected
                  ? 'gradient-fire text-primary-foreground shadow-fire'
                  : todayDay
                    ? 'bg-secondary border border-primary/40 text-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
              }`}
            >
              <span className="text-[10px] font-medium uppercase">
                {format(day, 'EEE')}
              </span>
              <span className={`text-lg font-bold font-display leading-none ${selected ? '' : ''}`}>
                {format(day, 'd')}
              </span>
              <span className="text-[9px] uppercase">
                {format(day, 'MMM')}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default WeeklyDateStrip;
