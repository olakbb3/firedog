import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, ShoppingBag, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthGate } from '@/hooks/useAuthGate';
import { supabase } from '@/lib/supabaseClient';
import freeWodCover from '@/assets/free-wod-cover.jpg';
import stationStrengthCover from '@/assets/station-strength-cover.jpg';
import inferno45Cover from '@/assets/inferno-45-cover.jpg';

const LOCAL_COVERS: Record<string, string> = {
  FREE_WOD: freeWodCover,
  STATION_STRENGTH: stationStrengthCover,
  INFERNO45: inferno45Cover,
};

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
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [ownedSkus, setOwnedSkus] = useState<Set<string>>(new Set());
  const [todayWorkoutId, setTodayWorkoutId] = useState<string | null>(null);

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

      // Fetch today's workout, fallback to most recent
      const today = new Date().toISOString().split('T')[0];
      const { data: todayWod } = await supabase
        .from('workouts')
        .select('id')
        .eq('workout_date', today)
        .limit(1)
        .single();
      if (todayWod) {
        setTodayWorkoutId(todayWod.id);
      } else {
        const { data: latestWod } = await supabase
          .from('workouts')
          .select('id')
          .order('workout_date', { ascending: false })
          .limit(1)
          .single();
        if (latestWod) setTodayWorkoutId(latestWod.id);
      }
    };
    fetchData();
  }, [user]);

  const handlePurchase = (storeLink: string | null) => {
    window.open(storeLink || 'https://firedogworks.store', '_blank');
  };

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold font-display mb-6">PROGRAMS</h1>

      <div className="space-y-4">
        {programs.map((program) => {
          const isFree = program.is_free;
          const isOwned = ownedSkus.has(program.sku);

          const canNavigate = isFree || isOwned;
          const handleNavigate = () => navigate(`/program/${program.id}`);

          return (
            <div
              key={program.id}
              className="rounded-xl bg-card border border-border overflow-hidden shadow-card"
            >
              {/* Program Image */}
              {(program.image_url || LOCAL_COVERS[program.sku]) && (
                <div
                  className={`w-full h-40 overflow-hidden ${canNavigate ? 'cursor-pointer' : ''}`}
                  onClick={canNavigate ? handleNavigate : undefined}
                >
                  <img
                    src={program.image_url || LOCAL_COVERS[program.sku]}
                    alt={program.title}
                    className="w-full h-full object-cover"
                    loading="lazy"
                    width={1024}
                    height={576}
                  />
                </div>
              )}

              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <h2
                    className={`font-bold font-display text-lg ${canNavigate ? 'cursor-pointer hover:underline' : ''}`}
                    onClick={canNavigate ? handleNavigate : undefined}
                  >
                    {program.title}
                  </h2>
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
                  <Button
                    onClick={() => {
                      if (todayWorkoutId) {
                        navigate(`/workout/${todayWorkoutId}`);
                      } else {
                        toast("No workout scheduled for today. Check back soon!");
                      }
                    }}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-display"
                  >
                    <Flame className="h-4 w-4 mr-2" />
                    START WORKOUT
                  </Button>
                ) : isOwned ? (
                  <Button
                    onClick={handleNavigate}
                    className="w-full bg-destructive text-destructive-foreground hover:bg-destructive/90 font-display"
                  >
                    VIEW PROGRAM
                  </Button>
                ) : (
                  <Button
                    onClick={() => handlePurchase(program.store_link)}
                    className="w-full bg-accent text-accent-foreground hover:bg-accent/90 font-display"
                  >
                    <ShoppingBag className="h-4 w-4 mr-2" />
                    UNLOCK PROGRAM
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
