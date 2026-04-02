

## Home Screen Declutter

### File: `src/pages/HomePage.tsx`

**1. Remove Featured Program section (lines ~156-175)**
- Delete the entire `{featuredProgram && !featuredProgram.is_free && (...)}` block
- Optionally remove the `featuredProgram` state, the query in `useEffect`, the `ProgramRow` interface, and the `Trophy` import (dead code cleanup)

**2. No other changes**
- WOD card, Weekly Date Strip, Active Challenges, Our Philosophy, Footer — all untouched
- No schema or navigation changes

### Result
Home page flow becomes: Header → Date Strip → Banner → WOD → Active Challenges → Our Philosophy → Footer

### Files Changed
- `src/pages/HomePage.tsx` — remove Featured Program block + dead code

