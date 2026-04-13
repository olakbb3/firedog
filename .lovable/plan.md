

## Premium Firedog Timer — Build Plan

### Summary
Replace the existing `WorkoutTimer` with a new premium timer at `src/components/workout/WorkoutTimer.tsx`. Add interval mode, 10-second pre-start countdown, Wake Lock, and sticky positioning.

### Files Changed

**1. `src/components/workout/WorkoutTimer.tsx` (NEW)**

Full rewrite of the timer component with:

- **Three modes** via tabbed selector: Stopwatch, Countdown, Intervals
- **State machine**: `idle` → `preStart` (10s) → `running` → `paused` → `finished`
- **Pre-start countdown**: On START click, initialize AudioContext (browser safety), show large "10...1" countdown with beeps at 3/2/1 and a long high-pitch beep at GO, then auto-transition to selected mode
- **Interval mode state**: `workTime`, `restTime`, `totalRounds`, `currentRound`, `phase` (work/rest). Display "Round X/Y" and "WORK"/"REST" labels with color coding
- **Massive display**: `font-mono text-6xl` for the main time, centered
- **Controls**: START (idle/paused), PAUSE (running), RESET (any). Disable mode tabs while running
- **Audio**: Reuse existing `playBeep` helper. Short beeps (3×) at pre-start 3/2/1 and interval transitions. Long high beep at GO
- **Wake Lock**: `navigator.wakeLock.request('screen')` on start, release on stop/unmount
- **Cleanup**: All intervals and wake locks cleared in `useEffect` cleanup

**2. `src/pages/WorkoutPage.tsx`**

- Update import path: `from '@/components/workout/WorkoutTimer'`
- Wrap timer in sticky container: `<div className="sticky top-0 z-50 bg-card border-b border-border shadow-md rounded-b-xl">` — placed **above** the whiteboard container (outside the card), so it sticks to viewport top
- Move the `WorkoutTimer` render from inside the whiteboard card to the new sticky wrapper

**3. Delete `src/components/WorkoutTimer.tsx`** (old location)

### Technical Details

**State machine flow:**
```text
idle ──START──> preStart(10s) ──0──> running ──PAUSE──> paused
  ^                                    │                  │
  └────────────RESET───────────────────┴──────────────────┘
                                       │
                                  (finish) ──> finished
```

**Interval tick logic:**
- Decrement phase timer each second
- When phase timer hits 0: if WORK → switch to REST timer; if REST → increment round, if last round → finish, else → switch to WORK timer
- Beep pattern at each phase transition (3 short beeps)

**Wake Lock:**
```typescript
const wakeLockRef = useRef<WakeLockSentinel | null>(null);
// Acquire on start
if ('wakeLock' in navigator) {
  wakeLockRef.current = await navigator.wakeLock.request('screen');
}
// Release on stop/unmount
wakeLockRef.current?.release();
```

**Sticky wrapper in WorkoutPage (outside whiteboard card):**
```tsx
{!isFiredogTotal && (
  <div className="sticky top-0 z-50 bg-card border-b border-border shadow-md rounded-b-xl px-5 py-3">
    <WorkoutTimer ... />
  </div>
)}
```

### Props unchanged
Same `WorkoutTimerProps` interface — no changes needed to parent data flow.

