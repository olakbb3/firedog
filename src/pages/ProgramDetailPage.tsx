import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { WorkoutService } from '@/services/workout.service';
import { WorkoutLogService } from '@/services/workoutLog.service';
import { ProgramService } from '@/services/program.service';

interface ProgramInfo {
  id: string;
  title: string;
  description: string;
  sku: string;
  is_free: boolean;
}

interface WorkoutRow {
  id: string;
  title: string;
  workout_date: string;
  section_count: number;
  completed: boolean;
}

const ProgramDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [program, setProgram] = useState<ProgramInfo | null>(null);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetch = async () => {
      // Fetch program
      const { data: prog } = await ProgramService.getProgramDetail(id);

      if (!prog) {
        toast.error('You need to unlock this program to view workouts.');
        navigate('/programs', { replace: true });
        return;
      }

      // Check access for non-free programs
      if (!prog.is_free && user) {
        const { data: owned } = await ProgramService.checkProgramOwnership(user.id, prog.sku);
        if (!owned) {
          toast.error('You need to unlock this program to view workouts.');
          navigate('/programs', { replace: true });
          return;
        }
      } else if (!prog.is_free && !user) {
        toast.error('You need to unlock this program to view workouts.');
        navigate('/programs', { replace: true });
        return;
      }

      setProgram(prog);

      // Fetch workouts for this program
      const { data: wods } = await WorkoutService.getProgramWorkouts(prog.id);

      if (!wods) {
        setWorkouts([]);
        setLoading(false);
        return;
      }

      // Count sections per workout
      const wodIds = wods.map(w => w.id);
      const { data: sections } = await WorkoutService.getSectionWorkoutIdsForWorkouts(wodIds);

      const sectionCounts: Record<string, number> = {};
      sections?.forEach(s => {
        sectionCounts[s.workout_id] = (sectionCounts[s.workout_id] || 0) + 1;
      });

      // Check completed logs for current user
      let completedSet = new Set<string>();
      if (user) {
        const { data: logs } = await supabase
          .from('workout_logs')
          .select('workout_id')
          .eq('user_id', user.id)
          .in('workout_id', wodIds);
        logs?.forEach(l => completedSet.add(l.workout_id));
      }

      setWorkouts(
        wods.map(w => ({
          id: w.id,
          title: w.title,
          workout_date: w.workout_date,
          section_count: sectionCounts[w.id] || 0,
          completed: completedSet.has(w.id),
        }))
      );
      setLoading(false);
    };

    fetch();
  }, [id, user, navigate]);

  const categoryLabel = program?.sku === 'INFERNO45' ? 'Engine' : program?.sku === 'STATION_STRENGTH' ? 'Strength' : 'WOD';

  if (loading) {
    return (
      <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-20 w-full" />
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!program) return null;

  return (
    <div className="px-4 pt-4 pb-6 max-w-lg mx-auto">
      {/* Back button */}
      <Button
        variant="ghost"
        size="sm"
        className="mb-3 -ml-2 text-muted-foreground"
        onClick={() => navigate('/programs')}
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Back to Programs
      </Button>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <h1 className="text-2xl font-bold font-display">{program.title}</h1>
          <Badge variant="secondary" className="text-xs shrink-0">{categoryLabel}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">{program.description}</p>
      </div>

      {/* Workout list */}
      <div className="space-y-2">
        {workouts.map(w => (
          <div
            key={w.id}
            onClick={() => navigate(`/workout/${w.id}`)}
            className="flex items-center justify-between bg-card border border-border rounded-xl px-4 py-3 cursor-pointer transition-transform active:scale-[0.97] hover:bg-card/80"
          >
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{w.title}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(w.workout_date + 'T00:00:00'), 'EEE, MMM d')}
                {w.section_count > 0 && ` · ${w.section_count} Sections`}
              </p>
            </div>
            {w.completed ? (
              <CheckCircle2 className="h-5 w-5 text-accent shrink-0" />
            ) : (
              <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
          </div>
        ))}
        {workouts.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-8">No workouts scheduled for this program yet.</p>
        )}
      </div>
    </div>
  );
};

export default ProgramDetailPage;
