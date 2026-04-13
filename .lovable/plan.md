

## Standardize Workout Date Field (`workout_date`)

### Changes needed across 6 files

**1. `src/types/index.ts`** — Make `workout_date` required, keep `date` as optional/deprecated
- Change `date: string` → `date?: string` and `workout_date?: string` → `workout_date: string`

**2. `src/pages/HomePage.tsx`**
- Interface: `workout_date: string` (non-nullable)
- Line 70: Remove fallback — use `w.workout_date` directly instead of `w.workout_date || w.date`

**3. `src/pages/WorkoutPage.tsx`**
- Interface: `workout_date: string` (non-nullable)
- Line 240-244: Remove conditional — always show `workout.workout_date`

**4. `src/pages/AdminDashboard.tsx`**
- Interface: make `workout_date: string` (non-nullable)
- Line 182: Use `new Date(w.workout_date + 'T00:00:00')` directly, drop `w.date` fallback
- Line 278: Remove `date:` field from insert (keep only `workout_date`)
- Line 453: Use `w.workout_date` directly, drop `|| w.date` fallback

**5. `src/pages/AdminProgramPage.tsx`**
- Interface: make `workout_date: string` (non-nullable)
- Line 160: Use `w.workout_date` directly, drop `w.date` fallback
- Line 295: Remove `date:` field from insert (keep only `workout_date`)
- Line 486: Use `w.workout_date` directly, drop `|| w.date` fallback

**6. `src/pages/ProgramsPage.tsx`** — Already uses `workout_date` exclusively. No changes needed.

### What stays the same
- Database schema untouched (`date` column remains)
- All `.order('workout_date', ...)` queries already correct
- LeaderboardPage already uses `workout_date` exclusively
- No changes to AdminProgramPage section/exercise logic

