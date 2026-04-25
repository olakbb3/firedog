import { useEffect, useMemo, useState } from 'react';
import { Archive, ChevronRight } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import type { CrewEntry } from '@/hooks/useLeaderboard';
import type { WorkoutSection } from '@/types/index';
import { reformatWeightString, useUnitPreference } from '@/lib/units';
import PerLiftLeaderboard from '@/components/PerLiftLeaderboard';
import LiveActivityFeed from '@/components/LiveActivityFeed';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';

interface ChallengeMonth {
  id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
}

const monthLabel = (date: string) =>
  new Date(`${date}T00:00:00`).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const buildCrew = (logs: any[]): CrewEntry[] => {
  const userSections = new Map<string, Map<string, { weight: number; is_rx: boolean; user_name: string }>>();
  logs.forEach(log => {
    if (!log.user_id || !log.workout_section_id || log.weight == null) return;
    if (!userSections.has(log.user_id)) userSections.set(log.user_id, new Map());
    const map = userSections.get(log.user_id)!;
    const existing = map.get(log.workout_section_id);
    if (!existing || log.weight > existing.weight) {
      map.set(log.workout_section_id, { weight: log.weight, is_rx: log.is_rx ?? true, user_name: log.user_name });
    }
  });

  return Array.from(userSections.entries()).map(([userId, sections]) => {
    let total = 0;
    let allRx = true;
    let userName = 'Athlete';
    sections.forEach(entry => {
      total += entry.weight;
      userName = entry.user_name || userName;
      if (!entry.is_rx) allRx = false;
    });
    return { user_id: userId, user_name: userName, result: `${total} lbs`, result_type: 'weight', is_rx: allRx };
  }).sort((a, b) => parseFloat(b.result) - parseFloat(a.result)).slice(0, 10);
};

const FiredogTotalArchive = () => {
  const unit = useUnitPreference();
  const [months, setMonths] = useState<ChallengeMonth[]>([]);
  const [selected, setSelected] = useState<ChallengeMonth | null>(null);
  const [details, setDetails] = useState<{ logs: any[]; sections: WorkoutSection[]; crew: CrewEntry[] }>({ logs: [], sections: [], crew: [] });

  useEffect(() => {
    const today = new Date().toLocaleDateString('en-CA');
    supabase
      .from('challenges')
      .select('id, title, description, start_date, end_date')
      .eq('title', 'FIREDOG TOTAL')
      .lt('end_date', today)
      .order('end_date', { ascending: false })
      .then(({ data }) => setMonths((data as ChallengeMonth[]) || []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    let cancelled = false;
    (async () => {
      const [sectionsRes, logsRes] = await Promise.all([
        supabase.from('workout_sections').select('*').eq('workout_id', selected.id).order('order_index'),
        supabase.from('workout_logs').select('user_id, workout_section_id, weight, is_rx, completion_date').eq('workout_id', selected.id).not('weight', 'is', null),
      ]);
      const logs = logsRes.data || [];
      const userIds = [...new Set(logs.map(l => l.user_id).filter(Boolean))];
      const profilesRes = userIds.length
        ? await supabase.from('profiles').select('id, full_name').in('id', userIds)
        : { data: [] as any[] };
      const names = new Map((profilesRes.data || []).map((p: any) => [p.id, p.full_name || 'Athlete']));
      const logsWithNames = logs.map(log => ({ ...log, user_name: names.get(log.user_id) || 'Athlete' }));
      if (!cancelled) setDetails({ logs: logsWithNames, sections: (sectionsRes.data as WorkoutSection[]) || [], crew: buildCrew(logsWithNames) });
    })();
    return () => { cancelled = true; };
  }, [selected]);

  const summaries = useMemo(() => months.map(month => ({ month, crew: month.id === selected?.id ? details.crew : [] })), [months, selected?.id, details.crew]);

  if (months.length === 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Archive className="h-4 w-4 text-primary" />
        <p className="text-xs font-bold tracking-widest">📅 PAST MONTHS ARCHIVE</p>
      </div>
      <div className="space-y-2">
        {summaries.map(({ month, crew }) => (
          <button key={month.id} type="button" onClick={() => setSelected(month)} className="w-full rounded-lg bg-secondary/50 border border-border p-3 text-left flex items-center justify-between gap-3 hover:border-primary/50 transition-colors">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold truncate">{monthLabel(month.start_date)}</span>
              <span className="block text-xs text-muted-foreground truncate">{crew[0] ? `${crew[0].user_name} — ${reformatWeightString(crew[0].result, unit)}` : 'Tap to view board'}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </button>
        ))}
      </div>
      <Drawer open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DrawerContent className="max-h-[88vh]">
          <DrawerHeader>
            <DrawerTitle>{selected ? `🔥 FIREDOG TOTAL — ${monthLabel(selected.start_date)}` : 'Archive'}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto space-y-4">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-bold tracking-widest mb-3">🏆 OVERALL TOTAL</p>
              {details.crew.length > 0 ? details.crew.map((entry, i) => (
                <div key={entry.user_id} className="flex items-center justify-between gap-2 text-sm font-body py-1">
                  <span className="flex items-center gap-2 min-w-0 flex-1"><span className="text-xs text-muted-foreground w-4 text-right shrink-0">{i + 1}</span><span className="truncate">{entry.user_name}</span></span>
                  <span className="text-xs text-muted-foreground shrink-0">{reformatWeightString(entry.result, unit)}</span>
                </div>
              )) : <p className="text-xs text-muted-foreground text-center py-3 italic">No totals logged.</p>}
            </div>
            <PerLiftLeaderboard rawLogs={details.logs} sections={details.sections} />
            <LiveActivityFeed rawLogs={details.logs} sections={details.sections} />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default FiredogTotalArchive;
