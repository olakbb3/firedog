

## Fix Firedog Total Leaderboard — Sum of Max Lifts

### Problem
The `useLeaderboard` hook deduplicates by keeping only the **latest single log per user**, then displays that one weight. For Firedog Total, the score should be the **sum of max weights across all 5 sections**.

### Current Bug Path
1. Query fetches all `workout_logs` for this workout (no First-In filter applies since Firedog Total has no "First-In" sections)
2. Date filter restricts to today only — but Firedog Total is a **monthly** challenge, so older logs are excluded too
3. Deduplication keeps one log per user → shows only that single weight as the result

### Fix — `src/hooks/useLeaderboard.ts`

**Add a `isFiredogTotal` parameter** (boolean) to `useLeaderboard`. When true, use completely different aggregation logic:

1. **Remove the today-only date filter** — instead filter to the current calendar month (`>= first day of month`, `< first day of next month`)
2. **Also select `workout_section_id`** in the query
3. **New aggregation logic**:
   - Group all logs by `user_id`
   - For each user, sub-group by `workout_section_id`
   - For each section, keep only the **max weight**
   - Sum those max weights across all sections → `combinedTotal`
4. **Sort users by `combinedTotal` descending**
5. **Format result** as `${combinedTotal} lbs`
6. **Set `is_rx`** to true if all of the user's best-section logs are Rx

**Callers updated**:
- `WorkoutPage.tsx` — pass `isFiredogTotal` to `useLeaderboard`
- `LeaderboardPage.tsx` — pass `false` (no change in behavior for regular workouts)

### Hook Signature Change
```
useLeaderboard(workoutId, sections, isFiredogTotal = false)
```

### Files Changed
- `src/hooks/useLeaderboard.ts` — add Firedog Total branch with monthly date range + sum-of-max-per-section logic
- `src/pages/WorkoutPage.tsx` — pass `isFiredogTotal` flag
- `src/pages/LeaderboardPage.tsx` — pass `false` explicitly (optional, default handles it)

