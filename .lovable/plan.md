

## Improve Timer Mode Selection UX

### Problem
The current mode toggle is a tiny `text-[10px]` button that looks like a label. Users won't realize they can tap it, and it doesn't allow setting a custom countdown duration.

### Proposed Changes

**File: `src/components/WorkoutTimer.tsx`**

1. **Replace the text toggle with a visible segmented control** using two styled buttons/tabs:
   - "FOR TIME" (stopwatch)
   - "COUNTDOWN" (countdown)
   - Highlight the active mode with primary color

2. **Add custom duration input for countdown mode**:
   - When "COUNTDOWN" is selected and no duration was auto-detected, show a simple minute input (e.g., a number stepper or small input field)
   - Pre-fill with auto-detected duration if available
   - Only visible when countdown mode is active and timer is not running

3. **Disable mode switching while timer is running** to prevent accidental resets

### UI Layout (top to bottom)
```text
┌─────────────────────────────┐
│  [ FOR TIME ]  [ COUNTDOWN ]│  ← segmented toggle
│                             │
│        12:00                │  ← large timer display
│    [  15  ] min             │  ← duration input (countdown only, when stopped)
│                             │
│    [ Start ]   [ Reset ]    │  ← action buttons
└─────────────────────────────┘
```

### Technical Details
- Add `customDuration` state (number, in minutes)
- When user selects countdown and no auto-detected duration, default to 10 minutes
- Duration input uses a simple `<input type="number" min={1} max={60}>`
- Segmented control uses existing `Button` component with `variant="outline"` / `variant="default"` for active state
- Auto-detected duration still pre-fills but is now editable

### Files Changed
- `src/components/WorkoutTimer.tsx` — redesign mode selector + add duration input

