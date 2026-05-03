import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Dumbbell,
  BookOpen,
  Image,
  Home,
  Trophy,
  X,
  Save,
  CalendarIcon,
  Eye,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { SectionResultType, SectionInputMode } from "@/types/index";

type Tab = "workouts" | "programs" | "challenges" | "media" | "home";

interface WorkoutRow {
  id: string;
  title: string;
  description: string;
  exercises: any[];
  date: string;
  workout_date: string | null;
}
interface ProgramRow {
  id: string;
  title: string;
  description: string;
  sku: string;
  store_link: string | null;
  image_url: string | null;
  is_free: boolean;
}
interface ChallengeRow {
  id: string;
  title: string;
  description: string | null;
  participants: number;
  start_date: string;
  end_date: string;
}

const RESULT_TYPE_OPTIONS: { value: SectionResultType; label: string }[] = [
  { value: "completed", label: "Just Completed" },
  { value: "time", label: "Time" },
  { value: "rounds_reps", label: "Rounds + Reps" },
  { value: "calories", label: "Calories" },
  { value: "meters", label: "Meters" },
  { value: "weight", label: "Weight" },
];

const INPUT_MODE_OPTIONS: { value: SectionInputMode; label: string }[] = [
  { value: "single", label: "Single Score" },
  { value: "per_exercise", label: "Per Exercise" },
];

const DEFAULT_SECTIONS = ["Morning Meeting", "Dispatch", "First-In", "Overhaul", "Rehab"];

const autoDetectInputMode = (exerciseCount: number): SectionInputMode =>
  exerciseCount >= 2 ? "per_exercise" : "single";

interface SectionInput {
  id?: string;
  section_name: string;
  result_type: SectionResultType;
  input_mode: SectionInputMode;
  time_cap_minutes?: string;
  exercises: ExerciseInput[];
  userOverrode?: boolean;
}

interface ExerciseInput {
  exercise_name: string;
  sets: string;
  reps: string;
  duration: string;
  calories: string;
  meters: string;
  notes: string;
  scaling_notes: string;
}

const emptyExercise = (): ExerciseInput => ({
  exercise_name: "",
  sets: "",
  reps: "",
  duration: "",
  calories: "",
  meters: "",
  notes: "",
  scaling_notes: "",
});

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { role } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("workouts");

  if (role !== "admin") return null;

  const tabs: { id: Tab; label: string; icon: React.ElementType }[] = [
    { id: "workouts", label: "Workouts", icon: Dumbbell },
    { id: "programs", label: "Programs", icon: BookOpen },
    { id: "challenges", label: "Challenges", icon: Trophy },
    { id: "media", label: "Media", icon: Image },
    { id: "home", label: "Home", icon: Home },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-30 bg-background/95 backdrop-blur-lg border-b border-border px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/")} className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <h1 className="text-lg font-bold font-display">ADMIN DASHBOARD</h1>
          </div>
        </div>
      </div>

      <div className="border-b border-border overflow-x-auto">
        <div className="max-w-4xl mx-auto flex">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === id
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {activeTab === "workouts" && <WorkoutsTab />}
        {activeTab === "programs" && <ProgramsTab />}
        {activeTab === "challenges" && <ChallengesTab />}
        {activeTab === "media" && <MediaTab />}
        {activeTab === "home" && <HomeTab />}
      </div>
    </div>
  );
};

const WorkoutsTab = () => {
  const { toast } = useToast();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formDate, setFormDate] = useState<Date | undefined>(new Date());
  const [sections, setSections] = useState<SectionInput[]>(
    DEFAULT_SECTIONS.map((name) => ({
      section_name: name,
      result_type: "completed" as SectionResultType,
      input_mode: "single" as SectionInputMode,
      exercises: [emptyExercise()],
      userOverrode: false,
    })),
  );
  const [showDuplicateDialog, setShowDuplicateDialog] = useState(false);
  const [pendingSave, setPendingSave] = useState(false);
  const [existingWorkoutForDate, setExistingWorkoutForDate] = useState<{ id: string; title: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchWorkouts = async () => {
    const { data, error } = await supabase
      .from("workouts")
      .select("*")
      .order("workout_date", { ascending: false, nullsFirst: false });
    if (error) {
      toast({ title: "Operation failed", description: error.message, variant: "destructive" });
      return;
    }
    if (data) setWorkouts(data);
  };

  useEffect(() => {
    fetchWorkouts();
  }, []);

  // Proactive duplicate-date check: whenever the selected date changes while the form is open,
  // look up whether a workout already exists for that date (excluding the one being edited).
  useEffect(() => {
    if (!showForm || !formDate) {
      setExistingWorkoutForDate(null);
      return;
    }
    const workoutDate = format(formDate, "yyyy-MM-dd");
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from("workouts")
        .select("id, title")
        .eq("workout_date", workoutDate)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        setExistingWorkoutForDate(null);
        return;
      }
      if (data && data.id !== editingId) {
        setExistingWorkoutForDate({ id: data.id, title: data.title });
      } else {
        setExistingWorkoutForDate(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [formDate, showForm, editingId]);

  const resetForm = () => {
    setFormTitle("");
    setFormDesc("");
    setFormDate(new Date());
    setEditingId(null);
    setSections(
      DEFAULT_SECTIONS.map((name) => ({
        section_name: name,
        result_type: "completed" as SectionResultType,
        input_mode: "single" as SectionInputMode,
        exercises: [emptyExercise()],
      })),
    );
  };

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      {
        section_name: "",
        result_type: "completed" as SectionResultType,
        input_mode: "single" as SectionInputMode,
        exercises: [emptyExercise()],
      },
    ]);
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSectionName = (idx: number, name: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, section_name: name } : s)));
  };

  const updateSectionResultType = (idx: number, rt: SectionResultType) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, result_type: rt } : s)));
  };

  const updateSectionInputMode = (idx: number, mode: SectionInputMode) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, input_mode: mode, userOverrode: true } : s)));
  };

  const updateSectionTimeCap = (idx: number, value: string) => {
    setSections((prev) => prev.map((s, i) => (i === idx ? { ...s, time_cap_minutes: value } : s)));
  };

  const moveSection = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= sections.length) return;
    setSections((prev) => {
      const arr = [...prev];
      [arr[idx], arr[target]] = [arr[target], arr[idx]];
      return arr;
    });
  };

  const addExercise = (sectionIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIdx) return s;
        const exercises = [...s.exercises, emptyExercise()];
        const input_mode = s.userOverrode ? s.input_mode : autoDetectInputMode(exercises.length);
        return { ...s, exercises, input_mode };
      }),
    );
  };

  const removeExercise = (sectionIdx: number, exIdx: number) => {
    setSections((prev) =>
      prev.map((s, i) => {
        if (i !== sectionIdx) return s;
        const exercises = s.exercises.filter((_, j) => j !== exIdx);
        if (exercises.length === 0) {
          return { ...s, exercises, userOverrode: false, input_mode: autoDetectInputMode(0) };
        }
        const input_mode = s.userOverrode ? s.input_mode : autoDetectInputMode(exercises.length);
        return { ...s, exercises, input_mode };
      }),
    );
  };

  const updateExercise = (sectionIdx: number, exIdx: number, field: keyof ExerciseInput, value: string) => {
    setSections((prev) =>
      prev.map((s, si) =>
        si === sectionIdx
          ? { ...s, exercises: s.exercises.map((ex, ei) => (ei === exIdx ? { ...ex, [field]: value } : ex)) }
          : s,
      ),
    );
  };

  const handleEdit = async (workoutId: string) => {
    const w = workouts.find((x) => x.id === workoutId);
    if (!w) return;

    setFormTitle(w.title);
    setFormDesc(w.description);
    setFormDate(new Date(w.workout_date + "T00:00:00"));
    setEditingId(workoutId);

    // Fetch sections and exercises for this workout
    const [sectionsRes, exercisesRes] = await Promise.all([
      supabase.from("workout_sections").select("*").eq("workout_id", workoutId).order("order_index"),
      supabase.from("exercises").select("*").eq("workout_id", workoutId).order("order_index"),
    ]);

    if (sectionsRes.error) {
      toast({ title: "Operation failed", description: sectionsRes.error.message, variant: "destructive" });
      return;
    }
    if (exercisesRes.error) {
      toast({ title: "Operation failed", description: exercisesRes.error.message, variant: "destructive" });
      return;
    }

    const dbSections = sectionsRes.data || [];
    const dbExercises = exercisesRes.data || [];

    if (dbSections.length > 0) {
      setSections(
        dbSections
          .map((s) => {
            const exercises = dbExercises
              .filter((e: any) => e.section_id === s.id)
              .map((e: any) => ({
                exercise_name: e.exercise_name || "",
                sets: e.sets?.toString() || "",
                reps: e.reps?.toString() || "",
                duration: e.duration || "",
                calories: e.calories != null ? String(e.calories) : "",
                meters: e.meters != null ? String(e.meters) : "",
                notes: e.notes || "",
                scaling_notes: (e as any).scaling_notes || "",
              }));
            const savedMode = (s.input_mode as SectionInputMode) || "single";
            const userOverrode = savedMode !== autoDetectInputMode(exercises.length);
            return {
              id: s.id,
              section_name: s.section_name,
              result_type: (s.result_type as SectionResultType) || "completed",
              input_mode: savedMode,
              time_cap_minutes: (s as any).time_cap_minutes != null ? String((s as any).time_cap_minutes) : "",
              exercises,
              userOverrode,
            };
          })
          .map((s) => (s.exercises.length === 0 ? { ...s, exercises: [emptyExercise()] } : s)),
      );
    } else {
      // Fallback: use JSON exercises column
      const jsonExercises = w.exercises || [];
      if (jsonExercises.length > 0) {
        setSections([
          {
            section_name: "Workout",
            result_type: "completed" as SectionResultType,
            input_mode: "single" as SectionInputMode,
            exercises: jsonExercises.map((e: any) => ({
              exercise_name: e.name || e.exercise_name || "",
              sets: e.sets?.toString() || "",
              reps: e.reps?.toString() || "",
              duration: e.duration || "",
              calories: e.calories != null ? String(e.calories) : "",
              meters: e.meters != null ? String(e.meters) : "",
              notes: e.notes || "",
              scaling_notes: (e as any).scaling_notes || "",
            })),
          },
        ]);
      } else {
        setSections(
          DEFAULT_SECTIONS.map((name) => ({
            section_name: name,
            result_type: "completed" as SectionResultType,
            input_mode: "single" as SectionInputMode,
            exercises: [emptyExercise()],
          })),
        );
      }
    }

    setShowForm(true);
  };

  const handleDelete = async (workoutId: string) => {
    // Delete exercises and sections first, then workout
    const [exercisesDelete, sectionsDelete] = await Promise.all([
      supabase.from("exercises").delete().eq("workout_id", workoutId),
      supabase.from("workout_sections").delete().eq("workout_id", workoutId),
    ]);
    if (exercisesDelete.error) {
      toast({ title: "Operation failed", description: exercisesDelete.error.message, variant: "destructive" });
      return;
    }
    if (sectionsDelete.error) {
      toast({ title: "Operation failed", description: sectionsDelete.error.message, variant: "destructive" });
      return;
    }
    const { error } = await supabase.from("workouts").delete().eq("id", workoutId);
    if (error) {
      toast({ title: "Error deleting workout", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Workout deleted" });
      fetchWorkouts();
    }
  };

  const executeSave = async () => {
    const workoutDate = formDate ? format(formDate, "yyyy-MM-dd") : null;
    // If not already editing but a workout exists for this date, treat that workout as the edit target.
    const effectiveId = editingId || existingWorkoutForDate?.id || null;
    let workoutId = effectiveId;

    if (effectiveId) {
      const { error } = await supabase
        .from("workouts")
        .update({
          title: formTitle,
          description: formDesc,
          workout_date: workoutDate,
        })
        .eq("id", effectiveId);
      if (error) throw error;
    } else {
      const { data: workout, error } = await supabase
        .from("workouts")
        .insert({
          title: formTitle,
          description: formDesc,
          exercises: [],
          workout_date: workoutDate,
        })
        .select()
        .single();
      if (error || !workout) throw error || new Error("Failed to create workout");
      workoutId = workout.id;
    }

    // Update or insert sections first so a failed insert never leaves the workout without sections.
    const sectionMap: Record<number, string> = {};
    const keptSectionIds = new Set<string>();
    for (let i = 0; i < sections.length; i++) {
      const s = sections[i];
      if (!s.section_name.trim()) continue;
      const sectionPayload = {
        workout_id: workoutId,
        section_name: s.section_name,
        result_type: s.result_type || "completed",
        input_mode: s.input_mode || "single",
        time_cap_minutes:
          s.time_cap_minutes && String(s.time_cap_minutes).trim() !== ""
            ? Math.max(0, parseInt(s.time_cap_minutes))
            : null,
        order_index: i,
      };

      if (editingId && s.id) {
        const { error: sectionUpdateError } = await supabase
          .from("workout_sections")
          .update(sectionPayload)
          .eq("id", s.id);
        if (sectionUpdateError) throw sectionUpdateError;
        sectionMap[i] = s.id;
        keptSectionIds.add(s.id);
      } else {
        const { data: insertedSection, error: sectionInsertError } = await supabase
          .from("workout_sections")
          .insert(sectionPayload)
          .select("id")
          .single();
        if (sectionInsertError || !insertedSection) throw sectionInsertError || new Error("Failed to create section");
        sectionMap[i] = insertedSection.id;
        keptSectionIds.add(insertedSection.id);
      }
    }

    // Build exercise rows with null safety
    const exerciseRows: any[] = [];
    sections.forEach((section, si) => {
      section.exercises
        .filter((ex) => ex.exercise_name && String(ex.exercise_name).trim())
        .forEach((ex, ei) => {
          exerciseRows.push({
            workout_id: workoutId,
            section_id: null, // will be updated after sections insert
            exercise_name: ex.exercise_name,
            sets: ex.sets && String(ex.sets).trim() !== "" ? parseInt(ex.sets) : null,
            reps: ex.reps && String(ex.reps).trim() !== "" ? parseInt(ex.reps) : null,
            duration: ex.duration ? String(ex.duration).trim() || null : null,
            calories: ex.calories && String(ex.calories).trim() !== "" ? parseInt(ex.calories) : null,
            meters: ex.meters && String(ex.meters).trim() !== "" ? parseInt(ex.meters) : null,
            notes: ex.notes ? String(ex.notes).trim() || null : null,
            scaling_notes: ex.scaling_notes ? ex.scaling_notes.trim() || null : null,
            order_index: ei,
            _sectionIndex: si,
          });
        });
    });

    // Delete old exercises only after section writes have succeeded.
    if (effectiveId) {
      const exercisesDelete = await supabase.from("exercises").delete().eq("workout_id", effectiveId);
      if (exercisesDelete.error) throw exercisesDelete.error;
      const sectionsDelete = await supabase
        .from("workout_sections")
        .delete()
        .eq("workout_id", effectiveId)
        .not("id", "in", `(${Array.from(keptSectionIds).join(",") || "00000000-0000-0000-0000-000000000000"})`);
      if (sectionsDelete.error) throw sectionsDelete.error;
    }

    // Assign section IDs to exercises
    const finalExerciseRows = exerciseRows.map((ex) => {
      const { _sectionIndex, ...rest } = ex;
      return { ...rest, section_id: sectionMap[_sectionIndex] || null };
    });

    // Insert exercises
    if (finalExerciseRows.length > 0) {
      const { error: exError } = await supabase.from("exercises").insert(finalExerciseRows);
      if (exError) throw exError;
    }

    toast({ title: effectiveId ? "Workout updated!" : "Workout created!" });
    setShowForm(false);
    resetForm();
    fetchWorkouts();
  };

  const handleSave = async () => {
    if (!formTitle.trim()) {
      toast({ title: "Please add a Workout Title.", variant: "destructive" });
      return;
    }
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      await executeSave();
    } catch (err: any) {
      const msg = err?.message || "";
      const details = err?.details || "";
      const isDuplicate =
        err?.code === "23505" ||
        msg.includes("unique_workout_date") ||
        msg.includes("duplicate key") ||
        details.includes("unique_workout_date") ||
        details.includes("duplicate key");

      if (isDuplicate) {
        toast({
          title: "Workout Already Exists",
          description:
            "This date already has a workout. Click 'Update Existing Workout' to overwrite it.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Operation failed",
          description: msg || "Could not save workout.",
          variant: "destructive",
        });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDuplicateSave = async () => {
    setShowDuplicateDialog(false);
    await handleSave();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold font-display">MANAGE WORKOUTS</h2>
        <Button
          size="sm"
          className="gradient-fire text-primary-foreground shadow-fire"
          onClick={() => {
            if (showForm) {
              setShowForm(false);
              resetForm();
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
        >
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-1" /> Cancel
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-1" /> Add Workout
            </>
          )}
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl bg-card border border-border p-5 mb-6 shadow-card space-y-4">
          {existingWorkoutForDate && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
              ⚠️ A workout already exists for this date{existingWorkoutForDate.title ? ` ("${existingWorkoutForDate.title}")` : ""}. Saving will overwrite the existing workout.
            </div>
          )}
          <Input
            placeholder="Workout Title"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="bg-secondary"
          />
          <Textarea
            placeholder="Description"
            value={formDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            className="bg-secondary"
            rows={2}
          />

          {/* Date Picker */}
          <div>
            <label className="text-xs text-muted-foreground mb-1 block font-display">WORKOUT DATE</label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn("w-full justify-start text-left font-normal", !formDate && "text-muted-foreground")}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {formDate ? format(formDate, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formDate}
                  onSelect={setFormDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Sections */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground font-display">SECTIONS</p>
              <Button variant="outline" size="sm" onClick={addSection} className="text-xs h-7">
                <Plus className="h-3 w-3 mr-1" /> Add Section
              </Button>
            </div>

            {sections.map((section, si) => (
              <div key={si} className="mb-4 rounded-lg border border-border bg-secondary/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex flex-col gap-0.5">
                    <button
                      onClick={() => moveSection(si, -1)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                      disabled={si === 0}
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => moveSection(si, 1)}
                      className="text-muted-foreground hover:text-foreground text-xs"
                      disabled={si === sections.length - 1}
                    >
                      ▼
                    </button>
                  </div>
                  <Input
                    placeholder="Section name"
                    value={section.section_name}
                    onChange={(e) => updateSectionName(si, e.target.value)}
                    className="bg-background text-sm font-bold flex-1"
                  />
                  <button
                    onClick={() => removeSection(si)}
                    className="text-destructive hover:bg-destructive/10 p-1 rounded"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {/* Result Type & Input Mode */}
                <div className="mb-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1 block">
                      Result Type
                    </label>
                    <Select
                      value={section.result_type}
                      onValueChange={(v) => updateSectionResultType(si, v as SectionResultType)}
                    >
                      <SelectTrigger className="bg-background text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RESULT_TYPE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider block">
                        Input Mode
                      </label>
                      {section.userOverrode && (
                        <span className="text-[9px] text-amber-500 font-medium">🔒 Manual override</span>
                      )}
                    </div>
                    <Select
                      value={section.input_mode || "single"}
                      onValueChange={(v) => updateSectionInputMode(si, v as SectionInputMode)}
                    >
                      <SelectTrigger className="bg-background text-xs h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {INPUT_MODE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value} className="text-xs">
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Optional Time Cap (minutes) */}
                <div className="mb-2">
                  <label className="text-[10px] text-muted-foreground font-display uppercase tracking-wider mb-1 block">
                    Time Cap (min, optional)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="—"
                    value={section.time_cap_minutes || ""}
                    onChange={(e) => updateSectionTimeCap(si, e.target.value)}
                    className="bg-background text-xs h-8 max-w-[120px]"
                  />
                </div>

                {section.exercises.map((ex, ei) => (
                  <div key={ei} className="mb-3 p-2 rounded-md bg-background/40 border border-border/60 space-y-1.5">
                    <div className="flex items-start gap-1.5">
                      <Input
                        placeholder="Exercise name"
                        value={ex.exercise_name}
                        onChange={(e) => updateExercise(si, ei, "exercise_name", e.target.value)}
                        className="bg-background text-xs flex-1"
                      />
                      <button
                        onClick={() => removeExercise(si, ei)}
                        className="p-2 text-destructive hover:bg-destructive/10 rounded shrink-0"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      <Input
                        placeholder="Sets"
                        type="number"
                        min="0"
                        value={ex.sets}
                        onChange={(e) => updateExercise(si, ei, "sets", e.target.value)}
                        className="bg-background text-xs"
                      />
                      <Input
                        placeholder="Reps"
                        type="number"
                        min="0"
                        value={ex.reps}
                        onChange={(e) => updateExercise(si, ei, "reps", e.target.value)}
                        className="bg-background text-xs"
                      />
                      <Input
                        placeholder="Time"
                        value={ex.duration}
                        onChange={(e) => updateExercise(si, ei, "duration", e.target.value)}
                        className="bg-background text-xs"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <Input
                        placeholder="Cals"
                        type="number"
                        min="0"
                        value={ex.calories}
                        onChange={(e) => updateExercise(si, ei, "calories", e.target.value)}
                        className="bg-background text-xs"
                      />
                      <Input
                        placeholder="Meters"
                        type="number"
                        min="0"
                        value={ex.meters}
                        onChange={(e) => updateExercise(si, ei, "meters", e.target.value)}
                        className="bg-background text-xs"
                      />
                    </div>
                    <Input
                      placeholder="Coach note"
                      value={ex.notes}
                      onChange={(e) => updateExercise(si, ei, "notes", e.target.value)}
                      className="bg-background text-xs"
                    />
                    <Textarea
                      placeholder="e.g. Sub ring rows for pull-ups, reduce weight by 50%"
                      value={ex.scaling_notes}
                      onChange={(e) => updateExercise(si, ei, "scaling_notes", e.target.value)}
                      className="bg-background text-xs"
                      rows={3}
                    />
                  </div>
                ))}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => addExercise(si)}
                  className="text-xs h-6 text-muted-foreground"
                >
                  <Plus className="h-3 w-3 mr-1" /> Exercise
                </Button>
              </div>
            ))}
          </div>

          <Button
            onClick={handleSave}
            disabled={isSubmitting}
            className="w-full gradient-fire text-primary-foreground shadow-fire"
          >
            <Save className="h-4 w-4 mr-2" />
            {isSubmitting
              ? "SAVING..."
              : editingId || existingWorkoutForDate
                ? "UPDATE EXISTING WORKOUT"
                : "SAVE NEW WORKOUT"}
          </Button>
        </div>
      )}

      {/* Duplicate Date Confirmation Dialog */}
      <AlertDialog open={showDuplicateDialog} onOpenChange={setShowDuplicateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplicate Workout Date</AlertDialogTitle>
            <AlertDialogDescription>
              A workout already exists for this day. Do you want to save anyway?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDuplicateSave}>Save Anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className="space-y-3">
        {workouts.map((w) => (
          <div
            key={w.id}
            className="rounded-xl bg-card border border-border p-4 shadow-card flex items-center justify-between"
          >
            <div>
              <h3 className="font-bold font-display text-sm">{w.title}</h3>
              <p className="text-xs text-muted-foreground">{w.workout_date}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEdit(w.id)}
                className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
              >
                <Edit className="h-4 w-4" />
              </button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="p-2 rounded-lg bg-secondary text-destructive hover:bg-destructive/10">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete "{w.title}"?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This will permanently delete the workout, its sections, and all exercises. This action cannot be
                      undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => handleDelete(w.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      Delete
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ProgramsTab = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [programs, setPrograms] = useState<ProgramRow[]>([]);

  const fetchPrograms = async () => {
    const { data } = await supabase
      .from("programs")
      .select("id, title, description, sku, store_link, image_url, is_free")
      .order("is_free", { ascending: false });
    if (data) setPrograms(data);
  };

  useEffect(() => {
    fetchPrograms();
  }, []);

  const isEditable = (p: ProgramRow) => {
    const t = (p.title + " " + (p.sku || "")).toLowerCase();
    return t.includes("firedog") || t.includes("engine");
  };
  const handleImageUpload = async (programId: string, file: File) => {
    const ext = file.name.split(".").pop();
    const path = `programs/${programId}.${ext}`;

    const { error: uploadError } = await supabase.storage.from("program-images").upload(path, file, { upsert: true });
    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      return;
    }

    const { data: urlData } = supabase.storage.from("program-images").getPublicUrl(path);
    const imageUrl = urlData.publicUrl + "?t=" + Date.now();

    const { error } = await supabase.from("programs").update({ image_url: imageUrl }).eq("id", programId);
    if (error) {
      toast({ title: "Error saving URL", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Image updated!" });
      fetchPrograms();
    }
  };

  const handleDelete = async (programId: string) => {
    const { error } = await supabase.from("programs").delete().eq("id", programId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Program deleted" });
      fetchPrograms();
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold font-display">MANAGE PROGRAMS</h2>
      </div>
      <div className="space-y-3">
        {programs.map((p) => (
          <div
            key={p.id}
            className={cn(
              "rounded-xl bg-card border border-border p-4 shadow-card",
              isEditable(p) && "cursor-pointer hover:border-primary/50 transition-colors",
            )}
            onClick={() => isEditable(p) && navigate(`/admin/programs/${p.id}`)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.title} className="w-12 h-12 rounded-lg object-cover shrink-0" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="font-bold font-display text-sm truncate">{p.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    {p.sku} • {p.is_free ? "Free" : "Premium"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <label className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground cursor-pointer">
                  <Image className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageUpload(p.id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-2 rounded-lg bg-secondary text-destructive hover:bg-destructive/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete "{p.title}"?</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently remove this program. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleDelete(p.id)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const ChallengesTab = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [challenges, setChallenges] = useState<ChallengeRow[]>([]);
  const [editing, setEditing] = useState<ChallengeRow | null>(null);
  const [desc, setDesc] = useState("");
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [endDate, setEndDate] = useState<Date | undefined>();
  const [lifts, setLifts] = useState<{ id?: string; section_name: string }[]>([]);
  const [saving, setSaving] = useState(false);
  const [hasFuture, setHasFuture] = useState(false);

  const fetchChallenges = () => {
    const todayLocal = new Date().toLocaleDateString("en-CA");
    supabase
      .from("challenges")
      .select("*")
      .eq("title", "FIREDOG TOTAL")
      .gte("end_date", todayLocal)
      .order("start_date", { ascending: true })
      .then(({ data, error }) => {
        if (error) {
          toast({ title: "Operation failed", description: error.message, variant: "destructive" });
          return;
        }
        const rows = (data as ChallengeRow[]) || [];
        setChallenges(rows);
        setHasFuture(rows.some((c) => c.start_date > todayLocal));
      });
  };

  useEffect(() => {
    fetchChallenges();
  }, []);

  const openEdit = async (challenge: ChallengeRow) => {
    setEditing(challenge);
    setDesc(challenge.description || "");
    setStartDate(challenge.start_date ? new Date(`${challenge.start_date}T00:00:00`) : undefined);
    setEndDate(challenge.end_date ? new Date(`${challenge.end_date}T00:00:00`) : undefined);
    const { data, error } = await supabase
      .from("workout_sections")
      .select("id, section_name")
      .eq("workout_id", challenge.id)
      .order("order_index");
    if (error) {
      toast({ title: "Operation failed", description: error.message, variant: "destructive" });
      return;
    }
    setLifts(((data as any[]) || []).map((s) => ({ id: s.id, section_name: s.section_name })));
  };

  const prepareNextMonth = async () => {
    const now = new Date();
    const nextStart = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextEnd = new Date(now.getFullYear(), now.getMonth() + 2, 0);
    const nextStartStr = format(nextStart, "yyyy-MM-dd");
    const nextEndStr = format(nextEnd, "yyyy-MM-dd");
    const { data: existing, error: existingError } = await supabase
      .from("challenges")
      .select("*")
      .eq("title", "FIREDOG TOTAL")
      .eq("start_date", nextStartStr)
      .maybeSingle();
    if (existingError) {
      toast({ title: "Operation failed", description: existingError.message, variant: "destructive" });
      return;
    }
    if (existing) {
      await openEdit(existing as ChallengeRow);
      return;
    }
    const current =
      challenges.find(
        (c) =>
          c.start_date <= new Date().toLocaleDateString("en-CA") &&
          c.end_date >= new Date().toLocaleDateString("en-CA"),
      ) || challenges[0];
    const currentLiftsRes = current
      ? await supabase.from("workout_sections").select("section_name").eq("workout_id", current.id).order("order_index")
      : { data: [] as any[], error: null };
    if (currentLiftsRes.error) {
      toast({ title: "Operation failed", description: currentLiftsRes.error.message, variant: "destructive" });
      return;
    }
    const currentLifts = currentLiftsRes.data;
    const draft: ChallengeRow = {
      id: "",
      title: "FIREDOG TOTAL",
      description: current?.description || "",
      participants: 0,
      start_date: nextStartStr,
      end_date: nextEndStr,
    };
    setEditing(draft);
    setDesc(draft.description || "");
    setStartDate(nextStart);
    setEndDate(nextEnd);
    setLifts(
      ((currentLifts as any[]) || [])
        .map((s) => ({ section_name: s.section_name }))
        .concat((currentLifts || []).length ? [] : [{ section_name: "Back Squat" }]),
    );
  };

  const saveChallenge = async () => {
    if (!editing || !startDate || !endDate) return;
    if (startDate >= endDate) {
      toast({ title: "Invalid dates", description: "Start date must be before end date.", variant: "destructive" });
      return;
    }
    const cleanLifts = lifts.map((l) => ({ ...l, section_name: l.section_name.trim() })).filter((l) => l.section_name);
    if (cleanLifts.length < 1) {
      toast({ title: "At least one lift is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const start = format(startDate, "yyyy-MM-dd");
    const end = format(endDate, "yyyy-MM-dd");
    let challengeId = editing.id;
    const payload = { title: "FIREDOG TOTAL", description: desc.trim() || null, start_date: start, end_date: end };
    const challengeRes = challengeId
      ? await supabase.from("challenges").update(payload).eq("id", challengeId)
      : await supabase
          .from("challenges")
          .insert({ ...payload, participants: 0 })
          .select("id")
          .single();
    if (challengeRes.error) {
      setSaving(false);
      toast({ title: "Save failed", description: challengeRes.error.message, variant: "destructive" });
      return;
    }
    if (!challengeId) challengeId = (challengeRes.data as any).id;
    const existingIds = cleanLifts.map((l) => l.id).filter(Boolean) as string[];
    const { error: deleteLiftError } = await supabase
      .from("workout_sections")
      .delete()
      .eq("workout_id", challengeId)
      .not("id", "in", `(${existingIds.join(",") || "00000000-0000-0000-0000-000000000000"})`);
    if (deleteLiftError) {
      setSaving(false);
      toast({ title: "Operation failed", description: deleteLiftError.message, variant: "destructive" });
      return;
    }
    for (let i = 0; i < cleanLifts.length; i++) {
      const lift = cleanLifts[i];
      if (lift.id) {
        const { error: liftUpdateError } = await supabase
          .from("workout_sections")
          .update({ order_index: i, result_type: "weight", input_mode: "single" })
          .eq("id", lift.id);
        if (liftUpdateError) {
          setSaving(false);
          toast({ title: "Operation failed", description: liftUpdateError.message, variant: "destructive" });
          return;
        }
      } else {
        const { error: liftInsertError } = await supabase
          .from("workout_sections")
          .insert({
            workout_id: challengeId,
            section_name: lift.section_name,
            order_index: i,
            result_type: "weight",
            input_mode: "single",
          });
        if (liftInsertError) {
          setSaving(false);
          toast({ title: "Operation failed", description: liftInsertError.message, variant: "destructive" });
          return;
        }
      }
    }
    setSaving(false);
    setEditing(null);
    fetchChallenges();
    toast({ title: "Firedog Total saved" });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-bold font-display">MANAGE CHALLENGES</h2>
        {!hasFuture && (
          <Button size="sm" onClick={prepareNextMonth} className="gradient-fire text-primary-foreground shadow-fire">
            <Plus className="h-4 w-4 mr-1" /> Prepare Next Month
          </Button>
        )}
      </div>
      <div className="space-y-3">
        {challenges.map((c) => (
          <div key={c.id} className="rounded-xl bg-card border border-border p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h3 className="font-bold font-display text-sm truncate">{c.title}</h3>
                <p className="text-xs text-muted-foreground mt-1">{c.description}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  {c.start_date} → {c.end_date}
                </p>
                <p className="text-xs text-muted-foreground mt-2">{c.participants} participants</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => navigate(`/workout/${c.id}`)}
                  className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <Eye className="h-4 w-4" />
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground"
                >
                  <Edit className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      {editing && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setEditing(null)}
        >
          <div
            className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-t-xl sm:rounded-xl bg-background border border-border p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold font-display">EDIT FIREDOG TOTAL</h3>
              <button onClick={() => setEditing(null)} className="p-2 rounded-lg bg-secondary">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Title</label>
                <Input value="FIREDOG TOTAL" disabled className="bg-secondary" />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Description / Coaching Notes</label>
                <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} className="bg-secondary" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ["Start date", startDate, setStartDate],
                  ["End date", endDate, setEndDate],
                ].map(([label, date, setter]: any) => (
                  <div key={label}>
                    <label className="text-xs text-muted-foreground mb-1 block">{label}</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline" className="w-full justify-start text-left font-normal">
                          <CalendarIcon className="h-4 w-4" />
                          {date ? format(date, "MMM d, yyyy") : "Pick date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={date}
                          onSelect={setter}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-muted-foreground block">Lifts</label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setLifts((prev) => [...prev, { section_name: "" }])}
                  >
                    <Plus className="h-3.5 w-3.5" /> Add
                  </Button>
                </div>
                <div className="space-y-2">
                  {lifts.map((lift, i) => (
                    <div key={lift.id || i} className="flex items-center gap-2">
                      <div className="relative flex-1 min-w-0">
                        <Input
                          value={lift.section_name}
                          disabled={!!lift.id}
                          title={lift.id ? "Rename by deleting this lift and adding a new one" : undefined}
                          onChange={(e) =>
                            setLifts((prev) =>
                              prev.map((l, idx) => (idx === i ? { ...l, section_name: e.target.value } : l)),
                            )
                          }
                          className="bg-secondary pr-8"
                        />
                        {lift.id && (
                          <Lock className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <button
                        disabled={lifts.length <= 1}
                        onClick={() =>
                          setLifts((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)))
                        }
                        className="p-2 rounded-lg bg-secondary text-destructive disabled:opacity-40"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => editing.id && navigate(`/workout/${editing.id}`)}
                  className="flex-1"
                >
                  <Eye className="h-4 w-4" /> Preview
                </Button>
                <Button
                  disabled={saving}
                  onClick={saveChallenge}
                  className="flex-1 gradient-fire text-primary-foreground"
                >
                  <Save className="h-4 w-4" /> Save
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MediaTab = () => (
  <div>
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-bold font-display">MEDIA LIBRARY</h2>
      <Button size="sm" className="gradient-fire text-primary-foreground shadow-fire">
        <Plus className="h-4 w-4 mr-1" /> Upload
      </Button>
    </div>
    <div className="rounded-xl bg-card border border-border p-8 text-center shadow-card">
      <Image className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
      <p className="text-sm text-muted-foreground">No media assets yet.</p>
    </div>
  </div>
);

const HomeTab = () => {
  const [workouts, setWorkouts] = useState<{ id: string; title: string }[]>([]);
  const [programs, setPrograms] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    const fetch = async () => {
      const [w, p] = await Promise.all([
        supabase.from("workouts").select("id, title"),
        supabase.from("programs").select("id, title"),
      ]);
      if (w.data) setWorkouts(w.data);
      if (p.data) setPrograms(p.data);
    };
    fetch();
  }, []);

  return (
    <div>
      <h2 className="font-bold font-display mb-4">HOME SCREEN CONTENT</h2>
      <div className="space-y-4">
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="text-xs text-muted-foreground mb-2 block">Banner Text</label>
          <Input defaultValue="FORGE YOUR FIRE" className="bg-secondary" />
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="text-xs text-muted-foreground mb-2 block">Motivational Quote</label>
          <Textarea
            defaultValue='"The fire inside you burns brighter than the fire around you." — Unknown'
            className="bg-secondary"
            rows={2}
          />
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="text-xs text-muted-foreground mb-2 block">Featured Workout</label>
          <select className="w-full rounded-lg bg-secondary border border-border p-2 text-sm text-foreground">
            {workouts.map((w) => (
              <option key={w.id} value={w.id}>
                {w.title}
              </option>
            ))}
          </select>
        </div>
        <div className="rounded-xl bg-card border border-border p-4 shadow-card">
          <label className="text-xs text-muted-foreground mb-2 block">Featured Program</label>
          <select className="w-full rounded-lg bg-secondary border border-border p-2 text-sm text-foreground">
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
        <Button className="w-full gradient-fire text-primary-foreground font-display shadow-fire">SAVE CHANGES</Button>
      </div>
    </div>
  );
};

export default AdminDashboard;
