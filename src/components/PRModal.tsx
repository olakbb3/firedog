import { useMemo, useState } from 'react';
import { format, isToday, isYesterday, parseISO } from 'date-fns';
import { Search } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import type { PersonalRecord } from '@/utils/personalRecords';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  records: PersonalRecord[];
}

const formatDate = (s: string): string => {
  if (!s) return '';
  try {
    const d = parseISO(s);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'MMM d');
  } catch {
    return '';
  }
};

const categoryIcon = (cat: PersonalRecord['category']) => {
  if (cat === 'strength') return '💪';
  if (cat === 'cardio') return '⏱️';
  return '⏱️';
};

type TabKey = 'all' | 'strength' | 'wod' | 'cardio';

export default function PRModal({ open, onOpenChange, records }: Props) {
  const [tab, setTab] = useState<TabKey>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const sorted = [...records].sort((a, b) =>
      a.date_achieved < b.date_achieved ? 1 : -1
    );
    const byTab = sorted.filter((r) => (tab === 'all' ? true : r.category === tab));
    const q = query.trim().toLowerCase();
    if (!q) return byTab;
    return byTab.filter((r) => r.movement_name.toLowerCase().includes(q));
  }, [records, tab, query]);

  if (!open) return null; // lazy: do not render content unless opened

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] bg-card border-border flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-left font-display tracking-wider">
            🏆 PERSONAL RECORDS
          </SheetTitle>
        </SheetHeader>

        <div className="relative mt-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search movement…"
            className="pl-9 bg-secondary"
          />
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)} className="mt-3 flex-1 flex flex-col min-h-0">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="strength">Strength</TabsTrigger>
            <TabsTrigger value="wod">WODs</TabsTrigger>
            <TabsTrigger value="cardio">Cardio</TabsTrigger>
          </TabsList>

          <TabsContent value={tab} className="flex-1 min-h-0 overflow-y-auto mt-3">
            {filtered.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8 font-body">
                No PRs in this category yet.
              </p>
            ) : (
              <ul className="space-y-2 pb-6">
                {filtered.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border bg-background/50 px-3 py-2.5"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="shrink-0">{categoryIcon(r.category)}</span>
                      <span className="flex-1 min-w-0 truncate text-sm font-body">
                        {r.movement_name}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center gap-2">
                      <span className="text-sm font-semibold tabular-nums">
                        {r.pr_value}
                      </span>
                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {formatDate(r.date_achieved)}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
