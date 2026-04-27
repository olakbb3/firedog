import React from 'react';
import { X } from 'lucide-react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';

interface PointsGuideModalProps {
  children: React.ReactNode;
  points: number;
  rank: string | null | undefined;
}

const rankLabels: Record<string, string> = {
  Chief: '💎 Chief',
  Captain: '⭐ Captain',
  'Senior Firefighter': '🔥 Senior Firefighter',
  Firefighter: '🚒 Firefighter',
  Recruit: '🔰 Recruit',
};

const earningRows = [
  { icon: '🏋️', label: 'Standard Workout', points: '+10 pts' },
  { icon: '✅', label: 'Rx Bonus', points: '+5 pts (15 total)' },
  { icon: '🔥', label: 'Firedog Total Lift', points: '+20 pts' },
];

const rankRows = [
  { icon: '🔰', label: 'Recruit', range: '0–99 pts' },
  { icon: '🚒', label: 'Firefighter', range: '100–299 pts' },
  { icon: '🔥', label: 'Senior Firefighter', range: '300–599 pts' },
  { icon: '⭐', label: 'Captain', range: '600–999 pts' },
  { icon: '💎', label: 'Chief', range: '1000+ pts' },
];

const getNextRank = (points: number) => {
  if (points < 100) return '🚒 Firefighter';
  if (points < 300) return '🔥 Senior Firefighter';
  if (points < 600) return '⭐ Captain';
  if (points < 1000) return '💎 Chief';
  return null;
};

export const PointsGuideModal: React.FC<PointsGuideModalProps> = ({ children, points, rank }) => {
  const displayRank = rank ? rankLabels[rank] || rank : '🔰 Recruit';
  const nextRank = getNextRank(points);

  return (
    <Drawer>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="relative text-left border-b border-border shrink-0 pr-12">
          <DrawerTitle className="text-base font-display tracking-tight">
            Firedog Rank Guide
          </DrawerTitle>
          <DrawerClose
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </DrawerClose>
        </DrawerHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          <section>
            <h3 className="text-xs font-bold text-primary tracking-widest mb-2">EARNING POINTS</h3>
            <div className="space-y-2">
              {earningRows.map((row) => (
                <div key={row.label} className="rounded-md border border-border bg-card/50 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base" aria-hidden="true">{row.icon}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{row.label}</span>
                  </div>
                  <span className="text-sm font-bold text-primary shrink-0">{row.points}</span>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h3 className="text-xs font-bold text-primary tracking-widest mb-2">RANK TIERS</h3>
            <div className="space-y-2">
              {rankRows.map((row) => (
                <div key={row.label} className="rounded-md border border-border bg-card/50 p-3 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base" aria-hidden="true">{row.icon}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{row.label}</span>
                  </div>
                  <span className="text-sm text-muted-foreground shrink-0">{row.range}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-md border border-primary/30 bg-primary/10 p-3">
            <p className="text-xs font-bold text-primary tracking-widest mb-1">YOUR PROGRESS</p>
            <p className="text-sm font-semibold text-foreground">{points} pts — {displayRank}</p>
            {nextRank && (
              <p className="text-xs text-muted-foreground mt-1">Keep logging to reach {nextRank}!</p>
            )}
          </section>
        </div>

        <DrawerFooter className="border-t border-border shrink-0">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">Close</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default PointsGuideModal;