

## Fix: Firedog Total Sections Not Rendering

### Root Cause
`WorkoutPage.tsx` line in `groupedSections` logic: `.filter(g => g.exercises.length > 0)` removes all sections that have no exercises. Firedog Total sections (Deadlift, Back Squat, etc.) have no child exercises — each section itself represents a single lift.

### Fix

**File: `src/pages/WorkoutPage.tsx`**

1. Change the final filter in `groupedSections` to keep sections even when they have no exercises IF the workout is Firedog Total (or more generally, if `result_type` is set on the section — meaning the section itself is loggable content):

```
.filter(g => g.exercises.length > 0 || (g as any).result_type)
```

This preserves sections that have a `result_type` defined (like `weight`), even with no child exercises. The deduplication logic already handles the duplicate sections (SQL was run twice).

2. No other changes needed — `SectionLogButton` already renders per section, and the section name displays as the header.

### Cleanup (Manual Step)
You have duplicate sections (SQL ran twice). Run this in Supabase to remove duplicates, keeping only the first set:

```sql
DELETE FROM workout_sections
WHERE workout_id = '3a79ed4c-4842-4db8-8d1a-7bf63fd6688d'
  AND created_at = '2026-04-06T22:13:47.885858+00:00';
```

### Files Changed
- `src/pages/WorkoutPage.tsx` — update `groupedSections` filter to allow sections with `result_type` but no exercises

