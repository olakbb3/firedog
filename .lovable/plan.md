

## Two Issues: Time Input Friction + Streak Logic

### 1. Auto-format Time Input (Remove MM:SS Friction)

**Problem**: Users must manually type the colon in `08:23`. Typing `0823` fails validation.

**Fix in `src/components/SectionLogButton.tsx`**:

- Add an `autoFormatTime` helper that runs on every keystroke
- Strip non-digits, then auto-insert the colon before the last 2 digits
- Example: user types `0823` → display shows `08:23`; types `123` → shows `1:23`
- Update the validation regex to still accept `MM:SS` (already formatted by this point)
- Keep the "TIME (MM:SS)" label as a hint, but remove the "Use MM:SS format" error — it should never trigger

```text
User types:  0  →  0
             08 →  08
             082 → 0:82 → wait...
             0823 → 08:23  ✓
```

Actual logic: on change, strip non-digits, if length > 2 insert `:` before last 2 chars. Max 5 chars displayed.

### 2. Streak Logic — Current Behavior Explained

**How it works now**: The streak counts consecutive days backward starting from today (or yesterday). If your most recent log is from 2+ days ago, streak = 0. Missing one day breaks it.

**This is standard behavior** (same as Duolingo, Apple Fitness, etc.), but if you want a different approach, here are options:

- **Keep as-is** — standard streak, breaks on missed day (current)
- **Add grace period** — allow 1 rest day without breaking streak
- **Show "last active" date** — so users see when they last worked out even if streak is 0

**Past workouts not showing**: This is likely a separate issue with the date strip or workout query filtering. The workouts exist in the DB — they may just not appear on the home screen for past dates. I can investigate if needed.

### Files Changed
- `src/components/SectionLogButton.tsx` — auto-format time input, remove friction

