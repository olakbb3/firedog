

## Update Program CTAs + Wire Challenge Buttons

Two small, safe changes — no logic or schema modifications.

### 1. Update CTA Labels in ProgramsPage.tsx

- Change "PURCHASE ON STORE" → "UNLOCK PROGRAM" for paid/unowned programs
- Keep "START WORKOUT" for Free WOD and "VIEW PROGRAM" for owned programs
- No navigation or logic changes

### 2. Wire Challenge "Join" Buttons in HomePage.tsx

- Replace `handleJoinChallenge` with a function that navigates to `/programs` after auth check
- Change button label from "Join" to "View Program"
- All challenges route to `/programs` so users land on the page showing Free WOD + paid programs with clear options

### Files Changed
- `src/pages/ProgramsPage.tsx` — button label update (1 line)
- `src/pages/HomePage.tsx` — challenge button handler + label (2-3 lines)

