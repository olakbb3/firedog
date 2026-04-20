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
import { X } from 'lucide-react';
import { scalingGuideSections, quickNotes } from '@/data/scalingGuideContent';

interface ScalingGuideDrawerProps {
  children: React.ReactNode;
}

export const ScalingGuideDrawer: React.FC<ScalingGuideDrawerProps> = ({ children }) => {
  const [open, setOpen] = React.useState(false);

  const content = React.useMemo(
    () => (
      <>
        {scalingGuideSections.map((section) => (
          <div key={section.category}>
            <p className="text-xs font-bold text-primary tracking-widest mb-2">
              {section.category}
            </p>
            <div className="space-y-3">
              {section.items.map((item) => (
                <div
                  key={item.movement}
                  className="rounded-md border border-border bg-card/50 p-2.5"
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
                </div>
              ))}
            </div>
          </div>
        ))}

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
      </>
    ),
    []
  );

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

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {content}
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
