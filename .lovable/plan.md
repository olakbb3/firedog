

## Firedog Total Leaderboard Upgrade — Per-Lift Leaders + Live Feed

### Summary
Add `rawLogs` state to `useLeaderboard`, then render two new sections on the Firedog Total workout page: per-lift top 3 and a live activity feed.

### Files Changed

**1. `src/hooks/useLeaderboard.ts`**

- Add `rawLogs` state: `const [rawLogs, setRawLogs] = useState<any[]>([]);`
- Update Firedog Total query to also select `completion_date`
- After fetching logs, fetch profiles for all unique user IDs and attach `user_name` to each log
- Set `setRawLogs(logsWithNames)` (with names attached)
- On empty logs: also `setRawLogs([])`
- Existing `crew` logic (grouping, totals, sorting) remains untouched
- Update return: `return { crew, rawLogs }`

**2. `src/pages/WorkoutPage.tsx`**

- Destructure: `const { crew, rawLogs } = useLeaderboard(id, sections, isFiredogTotal)`
- Replace the existing leaderboard card (lines 322-350) with a conditional block:

  **If `isFiredogTotal`**, render three cards:

  **Card 1 — Overall Total**: Identical to current `crew` rendering (no changes)

  **Card 2 — Per-Lift Leaderboard**: 
  - Build `sectionMap` from `sections` array (id → section_name)
  - Group `rawLogs` by `workout_section_id`
  - For each section group: deduplicate by user (keep max weight), sort descending, take top 3
  - Render each section as a mini-list with rank, name, and weight

  **Card 3 — Live Activity Feed**:
  - Sort `rawLogs` by `completion_date` descending, take top 10
  - Render each as: `"{name} logged {weight} lbs on {section_name}"`
  - Show relative time (e.g. "2h ago")

  **If not Firedog Total**, render existing leaderboard card unchanged.

### No other files changed. No database changes. No new API calls beyond the existing profiles lookup (reused for rawLogs).

