

## Fix Free WOD Button Logic

### File: `src/pages/ProgramsPage.tsx`

**1. Fetch today's workout on mount**
- Add state: `todayWorkoutId: string | null`
- In the existing `useEffect`, query `workouts` table for today's date (`workout_date = CURRENT_DATE`)
- Fallback: if none found, fetch the most recent workout (`order by workout_date desc, limit 1`)
- Store the resulting ID

**2. Wire the "START WORKOUT" button (line 109)**
- Add `onClick`: if `todayWorkoutId` exists, `navigate(/workout/${todayWorkoutId})`
- If no ID available, show sonner toast: "No workout scheduled for today. Check back soon!"

**3. Import additions**
- `useNavigate` from react-router-dom
- `toast` from sonner

### No other files changed. No schema changes.

