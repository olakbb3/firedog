import { useMemo, useState } from 'react';
import { X } from 'lucide-react';

const monthKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

const NewMonthBanner = () => {
  const now = useMemo(() => new Date(), []);
  const storageKey = `fdw:firedog-total-banner:${monthKey(now)}`;
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(storageKey) === 'dismissed';
    } catch {
      return false;
    }
  });

  if (now.getDate() !== 1 || dismissed) return null;

  const month = now.toLocaleString('default', { month: 'long' });

  const handleDismiss = () => {
    try {
      localStorage.setItem(storageKey, 'dismissed');
    } catch {}
    setDismissed(true);
  };

  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/10 p-4 shadow-card">
      <div className="flex items-start gap-3">
        <p className="flex-1 min-w-0 text-sm font-bold font-display text-foreground leading-snug">
          🔥 {month} Firedog Total is now open — log your best lifts!
        </p>
        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-full p-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Dismiss Firedog Total banner"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default NewMonthBanner;
