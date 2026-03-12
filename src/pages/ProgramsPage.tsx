import { Lock, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { mockPrograms } from '@/data/mockData';

const ProgramsPage = () => {
  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">PROGRAMS</h1>

      <div className="space-y-4">
        {mockPrograms.map((program) => (
          <div key={program.id} className="rounded-xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-bold font-display text-lg">{program.title}</h2>
              {program.is_purchased ? (
                <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Unlocked
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  <Lock className="h-3 w-3" />
                  Locked
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mb-3">{program.description}</p>
            <div className="flex items-center gap-4 text-xs text-muted-foreground mb-4">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {program.duration_weeks} weeks
              </span>
              {program.price > 0 && (
                <span className="font-bold text-foreground">${program.price}</span>
              )}
              {program.price === 0 && (
                <span className="text-accent font-semibold">Free</span>
              )}
            </div>
            {program.is_purchased ? (
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground font-display">
                VIEW PROGRAM
              </Button>
            ) : (
              <Button
                onClick={() => window.open('https://firedogworks.store', '_blank')}
                className="w-full gradient-fire text-primary-foreground font-display shadow-fire"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                PURCHASE ON STORE
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProgramsPage;
