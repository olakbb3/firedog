import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import type { WorkoutSection, ExerciseRow, SectionInputMode } from "@/types/index";
import { parseTextWithLinks, extractLinkButtons, LinkButtons } from "@/lib/urlParser";
import SectionLogButton from "@/components/SectionLogButton";
import PerExerciseLogButton from "@/components/PerExerciseLogButton";
import WorkoutTimer from "@/components/workout/WorkoutTimer";
import { useLeaderboard } from "@/hooks/useLeaderboard";
import FiredogLeaderboard from "@/components/FiredogLeaderboard";
import FiredogTotalArchive from "@/components/FiredogTotalArchive";
import { ScalingGuideDrawer } from "@/components/ScalingGuideDrawer";
import { BookOpen } from "lucide-react";
import { setPreferredUnit, useUnitPreference, type UnitSystem } from "@/lib/units";

interface WorkoutData {
  id: string;
  title: string;
  description: string;
  exercises: any[];
  coach_notes: string | null;
  video_url: string | null;
  date: string;
  workout_date: string | null;
}

interface PerformanceSnapshot {
  lastDate: string | null;
  bestResult: string | null;
  completedCount: number;
}

const WorkoutPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [workout, setWorkout] = useState<WorkoutData | null>(null);
  const [sections, setSections] = useState<WorkoutSection[]>([]);
  const [exercises, setExercises] = useState<ExerciseRow[]>([]);
  const [loading, setLoading] = useState(true);

  // Performance & leaderboard
  const [snapshot, setSnapshot] = useState<PerformanceSnapshot>({
    lastDate: null,
    bestResult: null,
    completedCount: 0,
  });
  const [timerResult, setTimerResult] = useState<string | null>(null);
  const isFiredogTotal = workout?.title?.toUpperCase() === "FIREDOG TOTAL";
  const { crew, rawLogs } = useLeaderboard(id, sections, isFiredogTotal);
  const unit = useUnitPreference(user?.id);

  useEffect(() => {
    if (!id) return;
    const fetchWorkout = async () => {
      setLoading(true);
      const [workoutRes, sectionsRes, exercisesRes] = await Promise.all([
        supabase.from("workouts").select("*").eq("id", id).maybeSingle(),
        supabase.from("workout_sections").select("*").eq("workout_id", id).order("order_index"),
        supabase.from("exercises").select("*").eq("workout_id", id).order("order_index"),
      ]);
      if (workoutRes.data) {
        setWorkout(workoutRes.data);
      } else {
        const { data: challengeData } = await supabase
          .from("challenges")
          .select("id, title, description, start_date, end_date")
          .eq("id", id)
          .maybeSingle();

        if (challengeData) {
          setWorkout({
            id: challengeData.id,
            title: challengeData.title,
            description: challengeData.description || "",
            exercises: [],
            coach_notes: challengeData.description || null,
            video_url: null,
            date: challengeData.start_date,
            workout_date: challengeData.start_date,
          });
        }
      }
      if (sectionsRes.data) setSections(sectionsRes.data);
      if (exercisesRes.data) setExercises(exercisesRes.data);
      setLoading(false);
    };
    fetchWorkout();
  }, [id]);

  // Fetch performance snapshot
  useEffect(() => {
    if (!id || !user) return;
    const fetchPerformance = async () => {
      const { data: logs } = await supabase
        .from("workout_logs")
        .select("completion_date, time, reps")
        .eq("workout_id", id)
        .eq("user_id", user.id)
        .order("completion_date", { ascending: false });

      if (logs && logs.length > 0) {
        const bestTime = logs.filter((l) => l.time).sort((a, b) => (a.time || "").localeCompare(b.time || ""))[0]?.time;
        const bestReps = logs.filter((l) => l.reps).sort((a, b) => (b.reps || 0) - (a.reps || 0))[0]?.reps;

        setSnapshot({
          lastDate: logs[0].completion_date
            ? new Date(logs[0].completion_date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : null,
          bestResult: bestTime || (bestReps ? `${bestReps} reps` : null),
          completedCount: logs.length,
        });
      }
    };
    fetchPerformance();
  }, [id, user]);

  // isFiredogTotal is declared above (line 43)

  // Firedog Total month info
  const challengeMonth = new Date().toLocaleString("default", { month: "long" });
  const daysLeft = (() => {
    const now = new Date();
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return Math.ceil((lastDay.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  })();

  // Group exercises by section (deduplicate sections by name)
  const groupedSections = (() => {
    if (sections.length > 0) {
      const uniqueSections: WorkoutSection[] = [];
      const seenNames = new Set<string>();
      for (const s of sections) {
        if (!seenNames.has(s.section_name)) {
          seenNames.add(s.section_name);
          uniqueSections.push(s);
        }
      }

      const nameToIds = new Map<string, string[]>();
      for (const s of sections) {
        const ids = nameToIds.get(s.section_name) || [];
        ids.push(s.id);
        nameToIds.set(s.section_name, ids);
      }

      const groups = uniqueSections.map((s) => {
        const allIds = nameToIds.get(s.section_name) || [s.id];
        return {
          ...s,
          exercises: exercises
            .filter((e) => allIds.includes(e.section_id || ""))
            .sort((a, b) => a.order_index - b.order_index)
            .filter(
              (ex, idx, arr) =>
                arr.findIndex((e) => e.exercise_name === ex.exercise_name && e.order_index === ex.order_index) === idx,
            ),
        };
      });

      const allSectionIds = sections.map((s) => s.id);
      const unsectioned = exercises.filter((e) => !e.section_id || !allSectionIds.includes(e.section_id));
      if (unsectioned.length > 0) {
        groups.push({
          id: "legacy",
          workout_id: id || "",
          section_name: "Workout",
          order_index: -1,
          exercises: unsectioned,
        });
        groups.sort(
          (a, b) => (a.order_index === -1 ? -1 : a.order_index) - (b.order_index === -1 ? -1 : b.order_index),
        );
      }
      return groups.filter((g) => g.exercises.length > 0 || (g as any).result_type);
    }
    if (exercises.length > 0) {
      const deduped = exercises.filter(
        (ex, idx, arr) =>
          arr.findIndex((e) => e.exercise_name === ex.exercise_name && e.order_index === ex.order_index) === idx,
      );
      return [
        {
          id: "default",
          workout_id: id || "",
          section_name: "Workout",
          order_index: 0,
          exercises: deduped,
        },
      ];
    }
    if (workout?.exercises?.length) {
      return [
        {
          id: "json-fallback",
          workout_id: id || "",
          section_name: "Workout",
          order_index: 0,
          exercises: workout.exercises.map((e: any, i: number) => ({
            id: `json-${i}`,
            workout_id: id || "",
            section_id: null,
            exercise_name: e.name || e.exercise_name || "",
            sets: e.sets ?? null,
            reps: e.reps ?? null,
            duration: e.duration ?? null,
            notes: e.notes ?? null,
            order_index: i,
          })),
        },
      ];
    }
    return [];
  })();

  // Detect exercise type from prescribed metrics
  const getExerciseType = (ex: ExerciseRow): "cardio" | "time" | "strength" => {
    if ((ex as any).calories || (ex as any).meters) return "cardio";
    if (ex.duration) return "time";
    return "strength";
  };

  // Smart formatting based on exercise type
  const formatExLine = (ex: ExerciseRow): string => {
    const hasSets = ex.sets && ex.sets > 0;
    const prefix = hasSets ? `${ex.sets} × ` : "";
    const type = getExerciseType(ex);
    const cals = (ex as any).calories;
    const meters = (ex as any).meters;
    let metrics: string[] = [];

    if (type === "cardio") {
      if (cals && meters) metrics = [`${cals} cals`, `${meters} m`];
      else if (cals) metrics = [`${cals} cals`];
      else if (meters) metrics = [`${meters} m`];
    } else if (type === "time") {
      if (ex.duration) metrics = [`${ex.duration}`];
    } else {
      if (ex.reps) metrics = [`${ex.reps} reps`];
    }

    const metricString = metrics.length ? metrics.join(" / ") : "—";
    return `${prefix}${metricString} ${ex.exercise_name}`.trim();
  };

  // Unit chips matching type
  const getExerciseChips = (ex: ExerciseRow): string[] => {
    const type = getExerciseType(ex);
    const chips: string[] = [];
    if (type === "cardio") {
      if ((ex as any).calories) chips.push("CAL");
      if ((ex as any).meters) chips.push("M");
    } else if (type === "time") {
      if (ex.duration) chips.push("TIME");
    } else {
      if (ex.reps) chips.push("REPS");
    }
    return chips.slice(0, 3);
  };

  // Unified rest-day detection: ghost-proof.
  const isRestDay =
    !workout ||
    !groupedSections ||
    groupedSections.length === 0 ||
    groupedSections.every((s) => !s.exercises || s.exercises.length === 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!workout) {
    return (
      <div className="px-4 pt-6 text-center">
        <p className="text-muted-foreground">Workout not found.</p>
        <Button variant="outline" onClick={() => navigate("/")} className="mt-4">
          Go Home
        </Button>
      </div>
    );
  }

  if (isRestDay) {
    return (
      <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="text-sm font-body">Back</span>
        </button>
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          {workout.title ? (
            <>
              <h1 className="text-2xl font-bold tracking-tight">{workout.title}</h1>
              {workout.description && (
                <p className="mt-2 text-sm text-muted-foreground font-body">{workout.description}</p>
              )}
            </>
          ) : (
            <>
              <p className="text-3xl mb-2">🐾</p>
              <h1 className="text-xl font-bold font-display">Rest Day</h1>
              <p className="mt-1 text-sm text-muted-foreground font-body">
                Enjoy your recovery. No workout scheduled for today.
              </p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-4 max-w-lg mx-auto">
      {/* Back */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-5 w-5" />
        <span className="text-sm font-body">Back</span>
      </button>

      {/* === FIREDOG TOTAL CHALLENGE HEADER === */}
      {isFiredogTotal && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5 mb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-bold font-display leading-tight">
                🔥 FIREDOG TOTAL —{" "}
                {workout.workout_date
                  ? new Date(`${workout.workout_date}T00:00:00`).toLocaleDateString("en-US", {
                      month: "long",
                      year: "numeric",
                    })
                  : challengeMonth}
              </p>
              <p className="text-sm text-muted-foreground mt-1">Monthly Strength Challenge</p>
            </div>
            <div className="flex rounded-md bg-secondary p-0.5 shrink-0">
              {(["imperial", "metric"] as UnitSystem[]).map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setPreferredUnit(u)}
                  className={`px-2 py-0.5 text-[10px] font-bold rounded ${unit === u ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}
                >
                  {u === "imperial" ? "LBS" : "KG"}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-foreground mt-3">Test your max lifts and see where you rank.</p>
          <p className="text-[10px] text-muted-foreground mt-2 italic">
            Log your best lifts anytime this month. You can update your score as you improve. Ends in {daysLeft} days.
          </p>
        </div>
      )}

      {isFiredogTotal && workout.coach_notes && (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-body mb-1">Coaching Notes</p>
          <p className="text-xs text-muted-foreground italic font-body leading-relaxed">
            {parseTextWithLinks(workout.coach_notes)}
          </p>
          <LinkButtons links={extractLinkButtons(workout.coach_notes)} />
        </div>
      )}

      {/* === STICKY WORKOUT TIMER === */}
      {!isFiredogTotal && (
        <div className="sticky top-0 z-50 bg-card border-b border-border shadow-md rounded-b-xl mb-4 overflow-hidden">
          <WorkoutTimer
            workoutTitle={workout.title}
            workoutDescription={workout.description || ""}
            sectionNames={groupedSections.map((s) => s.section_name)}
            onTimerStop={setTimerResult}
          />
        </div>
      )}

      {/* === WHITEBOARD CONTAINER === */}
      <div className="rounded-xl border border-border bg-card p-5 mb-4">
        {/* Title */}
        <h1 className="text-2xl font-bold tracking-tight leading-tight">{workout.title}</h1>

        {/* Metadata row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground font-body">
          <span>{parseTextWithLinks(workout.description)}</span>
          <span className="text-border">•</span>
          <span>{workout.workout_date}</span>
        </div>
        <LinkButtons links={extractLinkButtons(workout.description)} />

        {/* === SCALING GUIDE TRIGGER === */}
        <div className={workout.description ? "mt-3" : "mt-4"}>
          <ScalingGuideDrawer>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-md border border-border bg-secondary/60 px-3 py-1.5 text-xs font-semibold font-body text-foreground hover:bg-secondary transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5 text-primary" />
              View Scaling Guide
            </button>
          </ScalingGuideDrawer>
        </div>

        {/* === ATHLETE SNAPSHOT === */}
        {user && (snapshot.lastDate || snapshot.completedCount > 0) && (
          <div className="mt-4 flex items-center gap-4 border-t border-border pt-3">
            {snapshot.lastDate && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Last</p>
                <p className="text-sm font-semibold font-body">{snapshot.lastDate}</p>
              </div>
            )}
            {snapshot.bestResult && (
              <div className="text-center">
                <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Best</p>
                <p className="text-sm font-semibold font-body">{snapshot.bestResult}</p>
              </div>
            )}
            <div className="text-center">
              <p className="text-[10px] text-muted-foreground font-body uppercase tracking-wider">Done</p>
              <p className="text-sm font-semibold font-body">{snapshot.completedCount}×</p>
            </div>
          </div>
        )}

        {/* Timer moved to sticky wrapper above */}

        {/* === MOVEMENT LIST WITH PER-SECTION LOGGING === */}
        <div className="mt-5 space-y-5">
          {groupedSections.map((section) => (
            <div key={section.id}>
              {/* Section header */}
              <p className="text-xs font-bold text-primary tracking-widest mb-1">
                {isFiredogTotal
                  ? `🏋️ MAX LIFT — ${section.section_name.toUpperCase()}`
                  : section.section_name.toUpperCase()}
              </p>
              {(section as any).time_cap_minutes && (section as any).time_cap_minutes > 0 && (
                <p className="text-[10px] text-muted-foreground font-body italic mb-2">
                  ⏱ Time Cap: {(section as any).time_cap_minutes} min
                </p>
              )}
              <div className="space-y-1">
                {section.exercises.map((ex) => {
                  const chips = getExerciseChips(ex);
                  return (
                    <div key={ex.id} className="py-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <p className="text-sm font-body text-foreground leading-snug">{formatExLine(ex)}</p>
                        {chips.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {chips.map((chip) => (
                              <span
                                key={chip}
                                className="text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded bg-secondary text-muted-foreground"
                              >
                                {chip}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      {ex.notes && (
                        <p className="text-xs text-muted-foreground italic mt-0.5 font-body">
                          {parseTextWithLinks(ex.notes)}
                        </p>
                      )}
                      {ex.scaling_notes && (
                        <p className="text-xs text-muted-foreground mt-1 font-body">💡 {ex.scaling_notes}</p>
                      )}
                      <LinkButtons links={extractLinkButtons(ex.notes)} />
                    </div>
                  );
                })}
              </div>
              {/* Per-section Log Result button — route by input_mode.
                  AMRAP (rounds_reps) ALWAYS uses single-score UI regardless of exercise count. */}
              {(() => {
                const sectionResultType = (section as any).result_type || "completed";
                const isAmrap = sectionResultType === "rounds_reps";
                const explicitMode = (section as any).input_mode as SectionInputMode | undefined | null;
                const inputMode: SectionInputMode =
                  isAmrap && explicitMode !== "per_exercise"
                    ? "single"
                    : (explicitMode ?? (section.exercises.length > 1 ? "per_exercise" : "single"));

                if (inputMode === "per_exercise") {
                  return (
                    <PerExerciseLogButton
                      workoutId={workout.id}
                      sectionId={section.id}
                      sectionName={section.section_name}
                      exercises={section.exercises}
                      resultType={sectionResultType}
                      isFiredogTotal={isFiredogTotal}
                    />
                  );
                }
                return (
                  <SectionLogButton
                    workoutId={workout.id}
                    sectionId={section.id}
                    sectionName={section.section_name}
                    resultType={sectionResultType}
                    exercises={section.exercises}
                    isFiredogTotal={isFiredogTotal}
                  />
                );
              })()}
            </div>
          ))}
        </div>

        {/* Coach Notes */}
        {workout.coach_notes && !isFiredogTotal && (
          <div className="mt-5 border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-body mb-1">Coach Notes</p>
            <p className="text-xs text-muted-foreground italic font-body leading-relaxed">
              {parseTextWithLinks(workout.coach_notes)}
            </p>
            <LinkButtons links={extractLinkButtons(workout.coach_notes)} />
          </div>
        )}
      </div>

      {/* === LEADERBOARD === */}
      {isFiredogTotal ? (
        <div className="space-y-4 mb-4">
          <FiredogLeaderboard crew={crew} rawLogs={rawLogs} sections={sections} />
          <FiredogTotalArchive />
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card p-4 mb-4">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="h-4 w-4 text-accent" />
            <p className="text-xs font-bold tracking-widest">TOP CREW</p>
          </div>
          {crew.length > 0 ? (
            <div className="space-y-1.5">
              {crew.map((entry, i) => (
                <div key={i} className="flex items-center justify-between text-sm font-body">
                  <span className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-4 text-right">{i + 1}</span>
                    <span className={i === 0 ? "text-accent font-semibold" : "text-foreground"}>{entry.user_name}</span>
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="text-muted-foreground text-xs">{entry.result}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${entry.is_rx ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"}`}
                    >
                      {entry.is_rx ? "Rx" : "SC"}
                    </span>
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground font-body text-center py-3 italic">
              The leaderboard is empty. Be the first to set the pace!
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default WorkoutPage;
