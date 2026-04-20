import React from 'react';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, X, Clock } from 'lucide-react';
import { scalingGuideSections, quickNotes } from '@/data/scalingGuideContent';

interface ScalingGuideDrawerProps {
  children: React.ReactNode;
}

const RECENT_KEY = 'scaling_recent';
const RECENT_MAX = 5;

export const ScalingGuideDrawer: React.FC<ScalingGuideDrawerProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');
  const [recentMovements, setRecentMovements] = React.useState<string[]>([]);

  // Load recents on open
  React.useEffect(() => {
    if (!open) return;
    try {
      const stored = localStorage.getItem(RECENT_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) setRecentMovements(parsed.slice(0, RECENT_MAX));
      }
    } catch {
      // ignore corrupted storage
    }
  }, [open]);

  // Reset search when drawer closes
  React.useEffect(() => {
    if (!open) setSearch('');
  }, [open]);

  const addToRecent = React.useCallback((movement: string) => {
    setRecentMovements((prev) => {
      const updated = [movement, ...prev.filter((m) => m !== movement)].slice(0, RECENT_MAX);
      try {
        localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
      } catch {
        // ignore quota errors
      }
      return updated;
    });
  }, []);

  const filteredSections = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return scalingGuideSections;
    return scalingGuideSections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) =>
          item.movement.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [search]);

  const hasResults = filteredSections.length > 0;
  const showRecents = !search.trim() && recentMovements.length > 0;

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[90vh] flex flex-col">
        <DrawerHeader className="relative text-left border-b border-border shrink-0 pr-12">
          <DrawerTitle className="text-base font-display tracking-tight">
            Movement Substitution Guide
          </DrawerTitle>
          <DrawerDescription className="text-xs font-body">
            Standard scaling options. Scale volume 1:1 unless noted.
          </DrawerDescription>
          <DrawerClose
            className="absolute right-3 top-3 rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </DrawerClose>
        </DrawerHeader>

        <div className="px-4 pt-3 pb-2 shrink-0 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              placeholder="Search movements..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-9 text-sm font-body"
              aria-label="Search movements"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {showRecents && (
            <div>
              <p className="text-xs font-bold text-primary tracking-widest mb-2 flex items-center gap-1.5">
                <Clock className="h-3 w-3" />
                RECENTLY VIEWED
              </p>
              <div className="flex flex-wrap gap-1.5">
                {recentMovements.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setSearch(m)}
                    className="text-xs font-body px-2 py-1 rounded-md bg-secondary text-foreground hover:bg-secondary/80 transition-colors"
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>
          )}

          {hasResults ? (
            filteredSections.map((section) => (
              <div key={section.category}>
                <p className="text-xs font-bold text-primary tracking-widest mb-2">
                  {section.category}
                </p>
                <div className="space-y-3">
                  {section.items.map((item) => (
                    <button
                      key={item.movement}
                      type="button"
                      onClick={() => addToRecent(item.movement)}
                      className="w-full text-left rounded-md border border-border bg-card/50 p-2.5 hover:bg-card transition-colors"
                    >
                      <p className="text-sm font-semibold text-foreground font-body">
                        {item.movement}
                      </p>
                      <ul className="mt-1 space-y-0.5">
                        {item.substitutions.map((sub, idx) => (
                          <li
                            key={idx}
                            className="text-xs text-muted-foreground font-body leading-snug"
                          >
                            → {sub}
                          </li>
                        ))}
                      </ul>
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="text-xs text-muted-foreground font-body text-center py-6 italic">
              No movements match "{search}".
            </p>
          )}

          {!search.trim() && (
            <div className="border-t border-border pt-4">
              <p className="text-xs font-bold text-primary tracking-widest mb-2">
                🔹 QUICK NOTES
              </p>
              <ul className="space-y-1">
                {quickNotes.map((note, idx) => (
                  <li key={idx} className="text-xs text-muted-foreground font-body">
                    • {note}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DrawerFooter className="border-t border-border shrink-0">
          <DrawerClose asChild>
            <Button variant="outline" className="w-full">
              Close
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default ScalingGuideDrawer;
