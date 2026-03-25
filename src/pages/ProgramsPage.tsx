import { useEffect, useState } from 'react';
import { Lock, CheckCircle2, ShoppingBag, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';

interface ProgramRow {
  id: string;
  title: string;
  description: string;
  sku: string;
  store_link: string | null;
  image_url: string | null;
  is_free: boolean;
}

const ProgramsPage = () => {
  const { user } = useAuth();
  const { requireAuth } = useAuthGate();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [ownedSkus, setOwnedSkus] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchData = async () => {
      const { data } = await supabase
        .from('programs')
        .select('id, title, description, sku, store_link, image_url, is_free')
        .order('is_free', { ascending: false });
      if (data) setPrograms(data);

      if (user) {
        const { data: owned } = await supabase
          .from('user_programs')
          .select('program_sku')
          .eq('user_id', user.id);
        if (owned) setOwnedSkus(new Set(owned.map(r => r.program_sku)));
      }
    };
    fetchData();
  }, [user]);

  const handlePurchase = (storeLink: string | null) => {
    if (!requireAuth('Purchase Program')) return;
    window.open(storeLink || 'https://firedogworks.store', '_blank');
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold font-display mb-6">PROGRAMS</h1>

      <div className="space-y-4">
        {programs.map((program) => {
          const isFree = program.is_free;
          const isOwned = ownedSkus.has(program.sku);

          return (
            <div
              key={program.id}
              className="rounded-xl bg-card border border-border overflow-hidden shadow-card"
            >
              {/* Program Image */}
              {program.image_url && (
                <div className="w-full h-40 overflow-hidden">
                  <img
                    src={program.image_url}
                    alt={program.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h2 className="font-bold font-display text-lg">{program.title}</h2>
                  {isFree ? (
                    <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Free
                    </span>
                  ) : isOwned ? (
                    <span className="flex items-center gap-1 text-xs text-accent bg-accent/10 px-2 py-1 rounded-full shrink-0">
                      <CheckCircle2 className="h-3 w-3" />
                      Owned
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-muted-foreground bg-secondary px-2 py-1 rounded-full shrink-0">
                      <Lock className="h-3 w-3" />
                      Premium
                    </span>
                  )}
                </div>

                <p className="text-sm text-muted-foreground mb-4">{program.description}</p>

                {isFree ? (
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display">
                    <Flame className="h-4 w-4 mr-2" />
                    START WORKOUT
                  </Button>
                ) : isOwned ? (
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display">
                    VIEW PROGRAM
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePurchase(program.store_link)}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-display"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    PURCHASE ON STORE
                  </Button>
                )}
              </div>
            </div>
          );
        })}
        {programs.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No programs available yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProgramsPage;
