

## Workout Timer — Implementation Plan

Your revised spec is better than the previous version. The key improvement is the "Important Behavior Fix" — no hardcoded default times, stopwatch always starts at 00:00, and countdown only activates when a duration is confidently parsed. This prevents confusing UX where a random "12:45" appears.

### Files Changed
- `src/components/WorkoutTimer.tsx` — new component
- `src/pages/WorkoutPage.tsx` — import timer, add `timerResult` state

### 1. New: `src/components/WorkoutTimer.tsx`

**Props**: `workoutTitle`, `workoutDescription`, `sectionNames: string[]`, `onTimerStop: (time: string) => void`

**Mode detection** (runs once on mount via `useMemo`):
- Lowercase-join all text inputs
- Regex for time patterns: `/(\d+)\s*min/i` → extract minutes
- If "amrap" found AND minutes parsed → Countdown mode with that duration
- If "for time" found → Stopwatch
- Fallback → Stopwatch (never guess a duration)

**State & refs**:
- `useState`: `seconds` (number), `isRunning` (boolean), `mode` ('stopwatch' | 'countdown')
- `useRef<ReturnType<typeof setInterval>>` for the interval
- Cleanup in `useEffect` return

**Tick logic**:
- Stopwatch: increment `seconds` each tick
- Countdown: decrement `seconds`, auto-stop at 0

**UI**:
- Large monospace `mm:ss` display (e.g. `font-mono text-5xl font-bold text-center`)
- Three buttons: Start / Stop / Reset — using existing `Button` component
- Small mode label below: "Mode: For Time" or "Mode: AMRAP (15:00)"
- Optional manual mode toggle (text link)
- Styled consistently with the whiteboard card design

**Result callback**: On Stop press, format current time as `mm:ss` and call `onTimerStop`

### 2. Modified: `src/pages/WorkoutPage.tsx`

- Import `WorkoutTimer`
- Add `const [timerResult, setTimerResult] = useState<string | null>(null)`
- Render `WorkoutTimer` inside the whiteboard container, between the athlete snapshot and the movement list
- Pass workout title, description, section names array, and `setTimerResult` as `onTimerStop`
- No changes to `SectionLogButton`, logging, or leaderboard

### Constraints respected
- No DB changes, no leaderboard changes, no logging changes
- Timer is purely local state, resets on unmount/navigation

