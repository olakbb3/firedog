# Fix Admin Form Duplicate Handling & Error Toast

Two small, scoped edits in `src/pages/AdminDashboard.tsx`. No DB changes, no layout/styling changes.

## Fix 1 — Proactive date check (useEffect, lines ~215–240)

Current behavior: the lookup filters with `.is("program_id", null)` and uses `.limit(1)` instead of `.maybeSingle()`. If an existing standalone WOD was ever saved with a non-null `program_id` (or RLS hides it under that filter), the check silently misses it — so the banner never appears and the form falls through to an INSERT, which then trips the unique constraint.

Change the query to match exactly what the unique constraint covers (the date), and use `maybeSingle()`:

```ts
const workoutDate = format(formDate, "yyyy-MM-dd");
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
```

Keep the `cancelled` guard, the `[formDate, showForm, editingId]` deps, and the early return when the form is closed or `formDate` is unset. The date is already formatted with `date-fns` `format(..., "yyyy-MM-dd")`, so no timezone drift.

## Fix 2 — Friendly error toast (handleSave catch, lines ~560–574)

Current catch only matches `err?.code === "23505"`. Supabase sometimes surfaces the constraint violation through `message`/`details` without a top-level `code` (e.g. when the error bubbles from a nested call). Broaden the detection and ensure the raw Postgres message is never shown for that case:

```ts
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
```

## Out of scope

- No changes to `executeSave`, section/exercise write order, or the duplicate-confirm dialog.
- No changes to the inline amber warning banner, button labels, mobile layout, or dark-mode styling.
- No DB migrations; the unique constraint stays as-is.
