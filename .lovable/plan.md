

## Workout Timer Audio & Haptics

Your spec is clean and complete. It aligns with the previously discussed plan and adds important details (AudioContext user-gesture compliance, iOS safety checks). No changes needed.

### Implementation

**File: `src/components/WorkoutTimer.tsx`**

1. Add `playBeep(freq, durationMs, repeats)` helper using Web Audio API (`AudioContext` + `OscillatorNode`). Lazily create `AudioContext` on first user gesture (Start button click) to satisfy browser autoplay policies.

2. Add `triggerVibration(pattern)` wrapper with `navigator.vibrate` existence check for silent failure on unsupported browsers.

3. In `start()` — call `playBeep(600, 150, 1)` + `triggerVibration([100])`

4. In countdown completion block (where `prev <= 1`) — call `playBeep(800, 200, 3)` + `triggerVibration([200, 100, 200, 100, 200])`

### Constraints respected
- No changes to timer logic, layout, state, or any other files
- Graceful degradation on all browsers

### Files Changed
- `src/components/WorkoutTimer.tsx` — add audio/vibration helpers and two trigger points

