import React from 'react';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerClose,
} from '@/components/ui/drawer';
import { X } from 'lucide-react';
import { scalingGuideSections, quickNotes } from '@/data/scalingGuideContent';

interface ScalingGuideDrawerProps {
  children: React.ReactNode;
}

export const ScalingGuideDrawer: React.FC<ScalingGuideDrawerProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="relative text-left border-b border-border">
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
            <X className="h-4 w-4" />
          </DrawerClose>
        </DrawerHeader>

        <div className="overflow-y-auto px-4 py-4 space-y-5">
          {scalingGuideSections.map((section) => (
            <div key={section.category}>
              <p className="text-xs font-bold text-primary tracking-widest mb-2">
                {section.category}
              </p>
              <div className="space-y-3">
                {section.items.map((item) => (
                  <div key={item.movement} className="rounded-md border border-border bg-card/50 p-2.5">
                    <p className="text-sm font-semibold text-foreground font-body">
                      {item.movement}
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {item.substitutions.map((sub, idx) => (
                        <li key={idx} className="text-xs text-muted-foreground font-body leading-snug">
                          → {sub}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}

          <div className="border-t border-border pt-4">
            <p className="text-xs font-bold text-primary tracking-widest mb-2">🔹 QUICK NOTES</p>
            <ul className="space-y-1">
              {quickNotes.map((note, idx) => (
                <li key={idx} className="text-xs text-muted-foreground font-body">
                  • {note}
                </li>
              ))}
            </ul>
          </div>

          <div className="h-4" />
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default ScalingGuideDrawer;
