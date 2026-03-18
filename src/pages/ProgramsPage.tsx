import { useEffect, useState } from 'react';
import { Lock, CheckCircle2, Clock, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';

interface ProgramRow {
  id: string;
  title: string;
  description: string;
  price: number;
  duration_weeks: number;
}

const ProgramsPage = () => {
  const { requireAuth } = useAuthGate();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);

  useEffect(() => {
    const fetchPrograms = async () => {
      const { data } = await supabase.from('programs').select('*').order('price');
      if (data) setPrograms(data);
    };
    fetchPrograms();
  }, []);

  const handlePurchase = () => {
    if (!requireAuth('Purchase Program')) return;
    window.open('https://firedogworks.store', '_blank');
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">PROGRAMS</h1>

      <div className="space-y-4">
        {programs.map((program) => (
          <div key={program.id} className="rounded-xl bg-card border border-border p-5 shadow-card">
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-bold font-display text-lg">{program.title}</h2>
              {program.price === 0 ? (
                <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  Free
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full">
                  <Lock className="h-3 w-3" />
                  Premium
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
            {program.price === 0 ? (
              <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground font-display">
                VIEW PROGRAM
              </Button>
            ) : (
              <Button
                onClick={handlePurchase}
                className="w-full gradient-fire text-primary-foreground font-display shadow-fire"
              >
                <ShoppingBag className="h-4 w-4 mr-2" />
                PURCHASE ON STORE
              </Button>
            )}
          </div>
        ))}
        {programs.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No programs available yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProgramsPage;
