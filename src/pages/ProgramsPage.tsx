import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle2, ShoppingBag, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutService } from '@/services/workout.service';
import { ProgramService } from '@/services/program.service';
import ErrorState from '@/components/ErrorState';
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
  const navigate = useNavigate();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);
  const [ownedSkus, setOwnedSkus] = useState<Set<string>>(new Set());
  const [todayWorkoutId, setTodayWorkoutId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setError(null);
      setLoading(true);
      try {
        const { data, error: pErr } = await ProgramService.getPublicPrograms();
        if (cancelled) return;
        if (pErr) throw pErr;
        if (data) setPrograms(data);

        if (user) {
          const { data: owned } = await ProgramService.getUserEntitlements(user.id);
          if (cancelled) return;
          if (owned) setOwnedSkus(new Set(owned.map(r => r.program_sku)));
        }

        // Fetch today's workout, fallback to most recent
        const today = new Date().toISOString().split('T')[0];
        const { data: todayWod } = await WorkoutService.getWorkoutIdByDate(today);
        if (cancelled) return;
        if (todayWod) {
          setTodayWorkoutId(todayWod.id);
        } else {
          const { data: latestWod } = await WorkoutService.getLatestWorkoutId();
          if (cancelled) return;
          if (latestWod) setTodayWorkoutId(latestWod.id);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('ProgramsPage fetch error:', err);
          setError(err?.message || 'Unable to load data.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchData();
    return () => { cancelled = true; };
  }, [user, reloadTick]);

  const handlePurchase = (storeLink: string | null) => {
    window.open(storeLink || 'https://firedogworks.store', '_blank');
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => { setError(null); setReloadTick((t) => t + 1); }} />;
  }

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold font-display mb-6">PROGRAMS</h1>

      {programs.length === 0 ? (
        <div className="text-center p-8 text-muted-foreground border border-dashed border-border rounded-lg">
          No programs are currently available. Check back soon.
        </div>
      ) : (

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
                    UNLOCK ON FIREDOGWORKS.STORE
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      )}
    </div>
  );
};

export default ProgramsPage;
